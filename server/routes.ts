import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { seed } from "./seed";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./auth";
import { db } from "./db";
import { battles, battleVotes, tracks, votes, type Profile } from "@shared/schema";
import { and, count, eq, isNotNull, sql } from "drizzle-orm";
import {
  isFounderAdminEmail,
  MAX_ACTIVE_TRACKS_PER_CREATOR,
  MAX_BATTLE_ROUNDS,
  MAX_CREATOR_AI_PROMPT_EDITS,
  MAX_TRACK_ARTISTIC_INTENT_CHARS,
  HOURS_BETWEEN_CREATOR_AI_PROMPT_EDITS,
  MIN_ACTIVE_HOURS,
  MIN_TRACK_ARTISTIC_INTENT_CHARS,
  NEX_FOUNDER_ADMIN_EMAIL,
  ROTATION_COOLDOWN_HOURS,
  isCreatorStudioRole,
} from "@shared/constants";
import { createApiAccessControl } from "./api-access";
import {
  sanitizeBattleForPublic,
  sanitizePublicProfileDetail,
  sanitizePublicProfileForDirectory,
  sanitizePublicTrack,
  sanitizeTrackDetailForPublic,
} from "./public-response";
import { apiMsg } from "./api-i18n";
import { resolveSunoShareToSongUuid } from "./suno-resolve";
import { resolveSoundCloudShareToPermalink } from "./soundcloud-resolve";
import { resolveTrackThumbnailUrl } from "@shared/trackThumbnail";
import { resolvePublicPlayCount } from "@shared/publicPlayCount";
import { normalizeStoredTrackLink } from "@shared/normalizeTrackLink";

function getUserId(req: any): string {
  return String(req.user?.id ?? req.user?.claims?.sub ?? "");
}

function getPostgresSqlStateFromErr(err: unknown): string | undefined {
  let cur: any = err;
  for (let depth = 0; depth < 8 && cur; depth += 1) {
    if (typeof cur.code === "string" && /^[0-9A-Z]{5}$/.test(cur.code)) return cur.code;
    cur = cur.cause ?? cur.originalError ?? cur.error ?? cur.err;
  }
  return undefined;
}

/** Ensure `users` row exists before likes/plays (avoids FK 500 on fresh OAuth sessions). */
async function persistSessionUser(req: any): Promise<string> {
  const userId = getUserId(req);
  if (!userId) return "";
  const u = req.user as {
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    profileImageUrl?: string | null;
  };
  try {
    await storage.upsertOAuthUser({
      id: userId,
      email: u?.email ?? null,
      firstName: u?.firstName ?? null,
      lastName: u?.lastName ?? null,
      profileImageUrl: u?.profileImageUrl ?? null,
    });
  } catch (err: any) {
    console.warn("[auth] upsertOAuthUser before action failed", err?.message);
    await storage.createUser({
      id: userId,
      email: u?.email ?? null,
      firstName: u?.firstName ?? null,
      lastName: u?.lastName ?? null,
      profileImageUrl: u?.profileImageUrl ?? null,
    });
  }
  return userId;
}

function publicTrackCoverUrl(t: {
  coverImageUrl?: string | null;
  mvUrl?: string | null;
  audioUrl?: string | null;
}): string | null {
  return resolveTrackThumbnailUrl({
    coverImageUrl: t.coverImageUrl,
    mvUrl: t.mvUrl,
    audioUrl: t.audioUrl,
  });
}

function publicTrackPlayCount(t: { playCount?: number | null; playsCount?: number | null }): number {
  return resolvePublicPlayCount(t);
}

function getUserEmail(req: any): string | null {
  return (req.user?.email ?? req.user?.claims?.email ?? null) as string | null;
}

function founderEnvEmail(): string {
  return (process.env.NEX_FOUNDER_ADMIN_EMAIL || NEX_FOUNDER_ADMIN_EMAIL).trim().toLowerCase();
}

/** Founder Google account is always admin; in non-production, any DB `admin` profile still counts (local dev). */
async function isAdmin(req: any): Promise<boolean> {
  const email = getUserEmail(req);
  if (isFounderAdminEmail(email, founderEnvEmail())) return true;
  const userId = getUserId(req);
  if (!userId) return false;
  const p = await storage.getProfileByUserId(userId);
  if (p?.role === "admin") {
    if (process.env.NODE_ENV === "production") return isFounderAdminEmail(email, founderEnvEmail());
    return true;
  }
  return false;
}

async function syncFounderProfileOnRead(req: any, p: Profile): Promise<Profile> {
  const email = getUserEmail(req);
  const founder = isFounderAdminEmail(email, founderEnvEmail());
  if (founder && p.role !== "admin") {
    return storage.updateProfile(p.id, { role: "admin", creatorApplicationStatus: "none" });
  }
  if (process.env.NODE_ENV === "production" && !founder && p.role === "admin") {
    return storage.updateProfile(p.id, { role: "listener" });
  }
  return p;
}

async function canBypassVoteLimits(req: any): Promise<boolean> {
  return isAdmin(req);
}

async function assertTrackAdmin(req: any, res: any): Promise<boolean> {
  if (!req.isAuthenticated?.()) {
    res.status(401).json({ message: apiMsg("인증이 필요합니다", "Unauthorized") });
    return false;
  }
  if (!(await isAdmin(req))) {
    res.status(403).json({ message: apiMsg("관리자 권한이 필요합니다", "Admin access required") });
    return false;
  }
  return true;
}

/** Staff admin → any track; creator → own tracks only. */
async function assertTrackOwnerOrAdmin(req: any, res: any, trackId: number): Promise<boolean> {
  if (!req.isAuthenticated?.()) {
    res.status(401).json({ message: apiMsg("인증이 필요합니다", "Unauthorized") });
    return false;
  }
  if (await isAdmin(req)) return true;
  const track = await storage.getTrack(trackId);
  if (!track) {
    res.status(404).json({ message: apiMsg("트랙을 찾을 수 없습니다", "Track not found") });
    return false;
  }
  const p = await storage.getProfileByUserId(getUserId(req));
  if (!p || p.id !== track.creatorId) {
    res.status(403).json({ message: apiMsg("본인 트랙만 수정하거나 삭제할 수 있습니다", "You can only edit or delete your own tracks") });
    return false;
  }
  return true;
}

async function assertCreatorCanPublishAnotherTrack(req: any, res: any, creatorProfileId: number): Promise<boolean> {
  const [activeCountRow] = await db
    .select({ n: count() })
    .from(tracks)
    .where(and(eq(tracks.creatorId, creatorProfileId), eq(tracks.isDeleted, false)));
  const activeCount = activeCountRow?.n ?? 0;
  if (activeCount >= MAX_ACTIVE_TRACKS_PER_CREATOR) {
    res.status(409).json({
      code: "ACTIVE_TRACK_LIMIT",
      message: apiMsg(
        "1인당 최대 제출곡은 2곡입니다. 건투를 빕니다",
        "You can have at most 2 active tracks. Good luck out there!",
      ),
    });
    return false;
  }

  const [latestArchived] = await db
    .select({ archivedAt: sql<Date | null>`max(${tracks.archivedAt})` })
    .from(tracks)
    .where(and(eq(tracks.creatorId, creatorProfileId), eq(tracks.isDeleted, true), isNotNull(tracks.archivedAt)));
  const archivedAt = latestArchived?.archivedAt ? new Date(latestArchived.archivedAt) : null;
  if (archivedAt) {
    const cooldownMs = ROTATION_COOLDOWN_HOURS * 60 * 60 * 1000;
    const remainingMs = archivedAt.getTime() + cooldownMs - Date.now();
    if (remainingMs > 0) {
      const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
      res.status(429).json({
        message: apiMsg(
          `트랙 교체 쿨다운 중입니다. 약 ${remainingHours}시간 후 다시 시도해 주세요`,
          `Rotation cooldown active. Try again in about ${remainingHours} hour(s).`,
        ),
      });
      return false;
    }
  }

  return true;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
  app.use(createApiAccessControl(isAdmin));

  // Get current user's profile — auto-creates a minimal profile on first access
  app.get(api.profiles.me.path, isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: apiMsg("인증이 필요합니다", "Unauthorized") });

    let p = await storage.getProfileByUserId(userId);

    if (!p) {
      await storage.createUser({
        id: userId,
        email: getUserEmail(req),
        firstName: req.user?.firstName ?? null,
        lastName: req.user?.lastName ?? null,
        profileImageUrl: req.user?.profileImageUrl ?? null,
      });

      const emailPrefix = (getUserEmail(req) ?? "").split("@")[0] ?? "";
      const baseUsername = emailPrefix || `user_${userId.slice(0, 8)}`;
      let username = baseUsername;
      const existing = await storage.getProfileByUsername(username);
      if (existing && existing.userId !== userId) {
        username = `${baseUsername}_${userId.slice(0, 4)}`;
      }
      p = await storage.createProfile({
        userId,
        username,
        role: "listener",
        country: null,
        creatorApplicationStatus: "none",
      });
    }

    p = await syncFounderProfileOnRead(req, p);
    const followerCount = await storage.getFollowerCount(p.id);
    const { userId: _uid, ...pub } = p;
    res.json({ ...pub, followerCount });
  });

  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: apiMsg("인증이 필요합니다", "Unauthorized") });
    const rows = await storage.listNotifications(userId, { limit: 50 });
    const unreadCount = await storage.getUnreadNotificationCount(userId);
    res.json({ unreadCount, items: rows });
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: apiMsg("인증이 필요합니다", "Unauthorized") });
    await storage.markAllNotificationsRead(userId);
    res.json({ ok: true });
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: apiMsg("인증이 필요합니다", "Unauthorized") });
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: apiMsg("잘못된 알림 ID입니다", "Invalid notification id") });
    }
    const ok = await storage.markNotificationRead(userId, id);
    if (!ok) return res.status(404).json({ message: apiMsg("알림을 찾을 수 없습니다", "Notification not found") });
    res.json({ ok: true });
  });

  /** Creator dashboard: followers, per-track plays/likes/battles, boost tickets (snapshot — not historical charts). */
  app.get("/api/profiles/me/analytics", isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: apiMsg("인증이 필요합니다", "Unauthorized") });
    const p = await storage.getProfileByUserId(userId);
    if (!p) return res.status(404).json({ message: apiMsg("프로필을 찾을 수 없습니다", "Profile not found") });
    if (!isCreatorStudioRole(p.role)) {
      return res.status(403).json({
        message: apiMsg(
          "크리에이터 또는 관리자 계정에서만 이용할 수 있습니다",
          "Available for creator and admin accounts only",
        ),
      });
    }
    const snapshot = await storage.getCreatorAnalyticsSnapshot(p.id);
    if (!snapshot) {
      return res.status(404).json({ message: apiMsg("프로필을 찾을 수 없습니다", "Profile not found") });
    }
    res.json(snapshot);
  });

  // Create / update profile (called from the onboarding modal)
  app.post(api.profiles.create.path, isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    const existing = await storage.getProfileByUserId(userId);
    const email = getUserEmail(req);
    const founder = isFounderAdminEmail(email, founderEnvEmail());
    const staffAdmin = await isAdmin(req);

    const { username, country, aiToolUsed, bio } = req.body;
    if (!username) return res.status(400).json({ message: apiMsg("사용자 이름이 필요합니다", "Username is required") });

    const requestedRole = typeof req.body.role === "string" ? req.body.role : "listener";

    let assignedRole: "listener" | "creator" | "admin";
    let creatorApplicationStatus: "none" | "pending" | "rejected" = (
      existing?.creatorApplicationStatus ?? "none"
    ) as "none" | "pending" | "rejected";

    if (founder) {
      assignedRole = "admin";
      creatorApplicationStatus = "none";
    } else if (existing?.role === "creator") {
      assignedRole = "creator";
      creatorApplicationStatus = "none";
    } else if (requestedRole === "creator") {
      if (staffAdmin) {
        assignedRole = "creator";
        creatorApplicationStatus = "none";
      } else {
        assignedRole = "listener";
        creatorApplicationStatus = "pending";
      }
    } else {
      assignedRole = "listener";
      if (creatorApplicationStatus === "pending") creatorApplicationStatus = "none";
    }

    if (existing) {
      const usernameCheck = await storage.getProfileByUsername(username);
      if (usernameCheck && usernameCheck.id !== existing.id) {
        return res.status(409).json({ message: apiMsg("이미 사용 중인 사용자 이름입니다", "Username already taken") });
      }
      const updated = await storage.updateProfile(existing.id, {
        username,
        role: assignedRole,
        country,
        aiToolUsed,
        bio,
        creatorApplicationStatus,
      });
      const { userId: _u1, ...pubU } = updated;
      return res.status(200).json(pubU);
    }

    const usernameCheck = await storage.getProfileByUsername(username);
    if (usernameCheck) return res.status(409).json({ message: apiMsg("이미 사용 중인 사용자 이름입니다", "Username already taken") });

    await storage.createUser({
      id: userId,
      email: getUserEmail(req),
      firstName: req.user?.firstName ?? null,
      lastName: req.user?.lastName ?? null,
      profileImageUrl: req.user?.profileImageUrl ?? null,
    });
    const p = await storage.createProfile({
      userId,
      username,
      role: assignedRole,
      country,
      aiToolUsed,
      bio,
      creatorApplicationStatus,
    });
    const { userId: _u2, ...pubP } = p;
    res.status(201).json(pubP);
  });

  // Get profile by ID
  app.get(api.profiles.get.path, async (req, res) => {
    const p = await storage.getProfile(Number(req.params.id));
    if (!p) return res.status(404).json({ message: apiMsg("프로필을 찾을 수 없습니다", "Profile not found") });
    res.json(sanitizePublicProfileDetail(p));
  });

  // Get profile by username (for creator pages)
  app.get("/api/profiles/by-username/:username", async (req, res) => {
    const p = await storage.getProfileByUsername(req.params.username.trim().toLowerCase());
    if (!p) return res.status(404).json({ message: apiMsg("프로필을 찾을 수 없습니다", "Profile not found") });
    const full = await storage.getProfile(p.id);
    if (!full) return res.status(404).json({ message: apiMsg("프로필을 찾을 수 없습니다", "Profile not found") });
    res.json(sanitizePublicProfileDetail(full));
  });

  // Follow a creator
  app.post("/api/profiles/:id/follow", isAuthenticated, async (req: any, res) => {
    const creatorProfileId = Number(req.params.id);
    await storage.followCreator(getUserId(req), creatorProfileId);
    res.json({ message: apiMsg("팔로우했습니다", "Following") });
  });

  // Unfollow a creator
  app.delete("/api/profiles/:id/follow", isAuthenticated, async (req: any, res) => {
    const creatorProfileId = Number(req.params.id);
    await storage.unfollowCreator(getUserId(req), creatorProfileId);
    res.json({ message: apiMsg("팔로우를 해제했습니다", "Unfollowed") });
  });

  // Check if following
  app.get("/api/profiles/:id/follow", isAuthenticated, async (req: any, res) => {
    const creatorProfileId = Number(req.params.id);
    const isFollowing = await storage.isFollowing(getUserId(req), creatorProfileId);
    res.json({ isFollowing });
  });

  // All tracks for a creator profile (any status, not deleted) — public profile track list
  app.get("/api/profiles/:id/tracks", async (req, res) => {
    const profileId = Number(req.params.id);
    if (!Number.isFinite(profileId)) {
      return res.status(400).json({ message: apiMsg("잘못된 프로필 ID입니다", "Invalid profile id") });
    }
    const profile = await storage.getProfile(profileId);
    if (!profile) return res.status(404).json({ message: apiMsg("프로필을 찾을 수 없습니다", "Profile not found") });
    const ts = await storage.getTracksByCreator(profileId);
    const trackIds = ts.map((t) => t.id);
    const battleStats = await storage.getBattleStatsForTracks(trackIds);
    const formatted = ts.map((t) =>
      sanitizePublicTrack({
        id: t.id,
        title: t.title,
        creatorName: t.artistName || t.creator.username,
        creatorId: t.creatorId,
        aiTool: t.aiTool,
        genre: t.genre,
        lyrics: t.lyrics,
        votes: t.listenerVotes,
        audioUrl: t.audioUrl,
        musicVideoUrl: t.mvUrl,
        coverImageUrl: publicTrackCoverUrl(t),
        description: t.description,
        aiCraftScore: t.aiCraftScore,
        neoScore: t.neoScore,
        playCount: publicTrackPlayCount(t as { playCount?: number; playsCount?: number }),
        playsCount: publicTrackPlayCount(t as { playCount?: number; playsCount?: number }),
        likesCount: t.likesCount ?? 0,
        rankingScore: t.rankingScore,
        trackType: t.trackType,
        status: t.status,
        winStreak: t.winStreak,
        aiPrompt: t.aiPrompt,
        aiPromptEditCount: t.aiPromptEditCount,
        aiPromptLastEditedAt: t.aiPromptLastEditedAt,
        createdAt: t.createdAt,
        ...(battleStats[t.id]
          ? {
              totalBattles: battleStats[t.id].totalBattles,
              wins: battleStats[t.id].wins,
              winRate: battleStats[t.id].winRate,
            }
          : {}),
      } as Record<string, unknown>),
    );
    res.json(formatted);
  });

  app.get(api.tracks.list.path, async (req, res) => {
    const requestedSortBy = (req.query.sortBy as "rankingScore" | "neoScore" | "createdAt") || undefined;
    const requestedStatus = (req.query.status as string) || undefined;
    const requestedTrackType = (req.query.trackType as string) || undefined;
    const resolvedTrackType = requestedStatus === "MV" ? "video" : requestedTrackType;
    const creatorIdRaw = req.query.creatorId;
    let creatorId: number | undefined;
    if (creatorIdRaw != null && String(creatorIdRaw).trim() !== "") {
      const n = Number(creatorIdRaw);
      if (Number.isFinite(n)) creatorId = n;
    }
    const trackFilter = {
      status: requestedStatus,
      mvChartListing: requestedStatus === "MV",
      featured: req.query.featured === "true",
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      genre: (req.query.genre as string) || undefined,
      // Default to newest-first so newly approved submissions show immediately.
      sortBy: requestedSortBy ?? "createdAt",
      trackType: resolvedTrackType,
      creatorId,
      q: (req.query.q as string) || undefined,
    };

    const ts = await storage.getTracks(trackFilter);

    const trackIds = ts.map((t) => t.id);
    const [battleStats, commentCounts] = await Promise.all([
      storage.getBattleStatsForTracks(trackIds),
      storage.getCommentCountsForTracks(trackIds),
    ]);

    const formatted = ts.map((t) =>
      sanitizePublicTrack({
        id: t.id,
        title: t.title,
        creatorName: t.artistName || t.creator.username,
        creatorId: t.creatorId,
        aiTool: t.aiTool,
        genre: t.genre,
        lyrics: t.lyrics,
        votes: t.listenerVotes,
        audioUrl: t.audioUrl,
        musicVideoUrl: t.mvUrl,
        coverImageUrl: publicTrackCoverUrl(t),
        description: t.description,
        aiCraftScore: t.aiCraftScore,
        neoScore: t.neoScore,
        playCount: publicTrackPlayCount(t as { playCount?: number; playsCount?: number }),
        playsCount: publicTrackPlayCount(t as { playCount?: number; playsCount?: number }),
        rankingScore: t.rankingScore,
        trackType: t.trackType,
        status: t.status,
        winStreak: t.winStreak,
        aiPrompt: t.aiPrompt,
        aiPromptEditCount: t.aiPromptEditCount,
        aiPromptLastEditedAt: t.aiPromptLastEditedAt,
        createdAt: t.createdAt,
        likesCount: (t as { likesCount?: number }).likesCount ?? 0,
        commentsCount: commentCounts[t.id] ?? 0,
        claimableByCreators: !!(t as { claimableByCreators?: boolean }).claimableByCreators,
        ...(battleStats[t.id]
          ? {
              totalBattles: battleStats[t.id].totalBattles,
              wins: battleStats[t.id].wins,
              winRate: battleStats[t.id].winRate,
            }
          : {}),
      } as Record<string, unknown>),
    );
    res.json(formatted);
  });

  app.post(api.tracks.seed.path, async (req, res) => {
    if ((process.env.ENABLE_SEED_ENDPOINT ?? "0") !== "1") {
      return res.status(403).json({ message: apiMsg("시드 API가 비활성화되어 있습니다", "Seed endpoint is disabled") });
    }
    const token = req.body.token;
    const expected = process.env.ADMIN_SEED_TOKEN;
    if (!expected || token !== expected) {
      return res.status(401).json({ message: apiMsg("인증이 필요합니다", "Unauthorized") });
    }
    await seed();
    res.json({ message: apiMsg("시드 처리가 시작되었습니다", "Seeding triggered") });
  });

  app.get("/api/tracks/check-url", async (req, res) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).json({ message: apiMsg("url 쿼리 파라미터가 필요합니다", "url query parameter is required") });
    const exists = await storage.trackUrlExists(url);
    res.json({ exists });
  });

  /** SoundCloud short links + profile/widget URLs → track permalink for w.soundcloud.com/player. */
  app.get("/api/soundcloud/resolve", async (req, res) => {
    const url = typeof req.query.url === "string" ? req.query.url.trim() : "";
    if (!url) {
      return res.status(400).json({
        permalink: null,
        message: apiMsg("url 쿼리가 필요합니다", "url query parameter is required"),
      });
    }
    try {
      const permalink = await resolveSoundCloudShareToPermalink(url);
      if (!permalink) {
        return res.status(422).json({
          permalink: null,
          message: apiMsg(
            "SoundCloud 곡(트랙) 공유 링크가 필요합니다. 프로필·홈만 있는 주소는 재생할 수 없습니다. SoundCloud에서 Share → Copy link로 받은 트랙 URL을 넣어 주세요.",
            "Need a SoundCloud track share link (Share → Copy link on the track page), not a profile-only URL.",
          ),
        });
      }
      res.json({ permalink });
    } catch {
      res.status(500).json({
        permalink: null,
        message: apiMsg(
          "SoundCloud 링크 확인 중 서버 오류가 났습니다",
          "Server error while resolving SoundCloud link",
        ),
      });
    }
  });

  /** Suno /s/short links redirect to /song/{uuid}; embed player only accepts the UUID form. */
  app.get("/api/suno/resolve", async (req, res) => {
    const url = typeof req.query.url === "string" ? req.query.url.trim() : "";
    if (!url) {
      return res.status(400).json({
        songUuid: null,
        message: apiMsg("url 쿼리가 필요합니다", "url query parameter is required"),
      });
    }
    try {
      const songUuid = await resolveSunoShareToSongUuid(url);
      if (!songUuid) {
        return res.status(422).json({
          songUuid: null,
          message: apiMsg(
            "Suno 링크에서 곡 UUID를 찾지 못했습니다. suno.com에서 곡 → ⋯ → 링크 복사로 받은 주소를 사용해 주세요",
            "Could not resolve this Suno link. In Suno: open the song → ⋯ → Copy link (prefer the full song URL).",
          ),
        });
      }
      res.json({ songUuid });
    } catch {
      res.status(500).json({
        songUuid: null,
        message: apiMsg("Suno 링크 확인 중 서버 오류가 났습니다", "Server error while resolving Suno link"),
      });
    }
  });

  const validGenres = ["Pop", "Dance", "Rock", "Hip-Hop & Rap", "Funk", "Lo-Fi & Chill"];

  function looksLikeGibberish(input: string): boolean {
    const s = input.trim();
    if (!s) return true;
    const compact = s.replace(/\s+/g, "");
    if (!compact) return true;
    if (/([A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ])\1{4,}/.test(compact)) return true;
    if (/^([ㄱ-ㅎㅏ-ㅣㅋㅋㅎ]+)$/.test(compact) && compact.length >= 5) return true;
    if (/^(?:[a-z]{2,4}){3,}$/i.test(compact) && !/[aeiou]/i.test(compact)) return true;
    const uniqueChars = new Set(compact.toLowerCase()).size;
    const uniqueRatio = uniqueChars / compact.length;
    if (compact.length >= 12 && uniqueRatio < 0.25) return true;
    const meaningfulTokenCount = (s.match(/[A-Za-z가-힣]{2,}/g) || []).length;
    if (s.length >= 20 && meaningfulTokenCount < 3) return true;
    return false;
  }

  async function submitPublicTrack(req: any, res: any): Promise<void> {
    if (!req.isAuthenticated?.()) {
      res.status(401).json({ message: apiMsg("인증이 필요합니다", "Unauthorized") });
      return;
    }
    const p = await storage.getProfileByUserId(getUserId(req));
    if (!p) {
      res.status(403).json({ message: apiMsg("프로필이 필요합니다", "Profile required") });
      return;
    }
    if (!p.id) {
      res.status(500).json({
        message: apiMsg(
          "제출용 프로필이 없습니다. 먼저 계정을 만든 뒤 다시 시도해 주세요",
          "No profile exists for submission. Create one account first.",
        ),
      });
      return;
    }
    // Active-track cap applies to every non-admin submitter (listener pre-approval and creator alike).
    if (!(await isAdmin(req))) {
      if (!(await assertCreatorCanPublishAnotherTrack(req, res, p.id))) return;
    }

    const {
      title,
      artistName,
      genre,
      trackLink,
      trackType,
      aiPrompt,
      originalityConfirmed,
      coverImageUrl,
      portfolioLink,
    } = req.body;
    if (!title || !artistName || !genre || !trackLink) {
      res.status(400).json({
        message: apiMsg(
          "제목, 아티스트명, 장르, 트랙 링크는 필수입니다",
          "title, artistName, genre, and trackLink are required",
        ),
      });
      return;
    }
    const intentTrim = typeof aiPrompt === "string" ? aiPrompt.trim() : "";
    if (intentTrim.length < MIN_TRACK_ARTISTIC_INTENT_CHARS) {
      res.status(400).json({
        message: apiMsg(
          `창작 의도 및 프롬프트는 최소 ${MIN_TRACK_ARTISTIC_INTENT_CHARS}자 이상이어야 합니다`,
          `Artistic intent & prompt must be at least ${MIN_TRACK_ARTISTIC_INTENT_CHARS} characters`,
        ),
      });
      return;
    }
    if (intentTrim.length > MAX_TRACK_ARTISTIC_INTENT_CHARS) {
      res.status(400).json({
        message: apiMsg(
          "창작 의도 및 프롬프트가 허용된 최대 길이를 초과했습니다",
          "Artistic intent & prompt is too long",
        ),
      });
      return;
    }
    if (looksLikeGibberish(intentTrim)) {
      res.status(400).json({
        message: apiMsg(
          "무의미한 반복/도배 텍스트는 등록할 수 없습니다. 창작 의도를 자연어로 작성해 주세요",
          "Gibberish or repetitive spam text is not allowed. Please describe your artistic intent in natural language.",
        ),
      });
      return;
    }
    if (originalityConfirmed !== true) {
      res.status(400).json({
        message: apiMsg(
          "이 트랙이 원본 AI 생성 콘텐츠임을 확인해야 합니다",
          "You must confirm this track is original AI-generated content",
        ),
      });
      return;
    }
    const portfolio = typeof portfolioLink === "string" ? portfolioLink.trim() : "";
    if (!portfolio) {
      res.status(400).json({
        message: apiMsg(
          "Social/Portfolio Link는 필수입니다",
          "Social/Portfolio link is required",
        ),
      });
      return;
    }
    try {
      const u = new URL(portfolio);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad_protocol");
    } catch {
      res.status(400).json({
        message: apiMsg(
          "Social/Portfolio Link는 유효한 http(s) URL이어야 합니다",
          "Social/Portfolio link must be a valid http(s) URL",
        ),
      });
      return;
    }
    if (!validGenres.includes(genre)) {
      res.status(400).json({ message: apiMsg("유효하지 않은 장르입니다", "Invalid genre") });
      return;
    }

    const normalizedTrackLink = normalizeStoredTrackLink(trackLink) ?? String(trackLink).trim();

    const duplicate = await storage.trackUrlExists(normalizedTrackLink);
    if (duplicate) {
      res.status(409).json({
        code: "DUPLICATE_TRACK_URL",
        message: apiMsg("이 URL로 이미 제출된 트랙이 있습니다", "A track with this URL has already been submitted"),
      });
      return;
    }

    let cover: string | null = null;
    if (coverImageUrl != null && String(coverImageUrl).trim()) {
      const s = String(coverImageUrl).trim();
      try {
        const u = new URL(s);
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          res.status(400).json({
            message: apiMsg("커버 이미지 URL은 http(s)여야 합니다", "Cover image URL must be http(s)"),
          });
          return;
        }
        cover = s;
      } catch {
        res.status(400).json({
          message: apiMsg("유효하지 않은 커버 이미지 URL입니다", "Invalid cover image URL"),
        });
        return;
      }
    }

    const resolvedTrackType = trackType === "video" ? "video" : "audio";
    // Listener submissions = creator registration request; always surfaces in admin (applications + pending tracks).
    if (!(await isAdmin(req)) && p.role === "listener") {
      await storage.updateProfile(p.id, { creatorApplicationStatus: "pending" });
    }

    const t = await storage.submitTrack({
      title,
      artistName,
      genre,
      trackLink: normalizedTrackLink,
      trackType: resolvedTrackType,
      aiPrompt: intentTrim,
      coverImageUrl: cover,
      portfolioLink: portfolio,
      creatorId: p.id,
    });
    res.status(201).json({
      message: apiMsg("제출이 완료되었습니다", "Success"),
      trackId: t.id,
      trackType: resolvedTrackType,
    });
  }

  app.get("/api/tracks/new", async (req, res) => {
    const q = (req.query.q as string) || undefined;
    const ts = await storage.getNewFeedTracks(250, q);
    const trackIds = ts.map((t) => t.id);
    const [battleStats, commentCounts] = await Promise.all([
      storage.getBattleStatsForTracks(trackIds),
      storage.getCommentCountsForTracks(trackIds),
    ]);
    const formatted = ts.map((t) =>
      sanitizePublicTrack({
        id: t.id,
        title: t.title,
        creatorName: t.artistName || t.creator.username,
        creatorId: t.creatorId,
        aiTool: t.aiTool,
        genre: t.genre,
        votes: t.listenerVotes,
        audioUrl: t.audioUrl,
        musicVideoUrl: t.mvUrl,
        coverImageUrl: publicTrackCoverUrl(t),
        playCount: publicTrackPlayCount(t as { playCount?: number; playsCount?: number }),
        likesCount: t.likesCount ?? 0,
        commentsCount: commentCounts[t.id] ?? 0,
        rankingScore: t.rankingScore,
        trackType: t.trackType,
        status: t.status,
        winStreak: t.winStreak,
        aiPrompt: t.aiPrompt,
        aiPromptEditCount: t.aiPromptEditCount,
        aiPromptLastEditedAt: t.aiPromptLastEditedAt,
        createdAt: t.createdAt,
        ...(battleStats[t.id]
          ? {
              totalBattles: battleStats[t.id].totalBattles,
              wins: battleStats[t.id].wins,
              winRate: battleStats[t.id].winRate,
            }
          : {}),
      } as Record<string, unknown>),
    );
    res.json(formatted);
  });

  app.get(api.tracks.get.path, async (req: any, res) => {
    const trackId = Number(req.params.id);
    const t = await storage.getTrack(trackId);
    if (!t) return res.status(404).json({ message: apiMsg("트랙을 찾을 수 없습니다", "Track not found") });
    const playCount = publicTrackPlayCount(t as { playCount?: number; playsCount?: number });
    const base = sanitizeTrackDetailForPublic({
      ...(t as Record<string, unknown>),
      playCount,
      playsCount: playCount,
      coverImageUrl: publicTrackCoverUrl(t),
      musicVideoUrl: (t as { mvUrl?: string | null }).mvUrl ?? null,
    });
    const commentCounts = await storage.getCommentCountsForTracks([trackId]);
    const withComments = { ...base, commentsCount: commentCounts[trackId] ?? 0 };
    const uid = req.user ? getUserId(req) : "";
    if (uid) {
      const viewerHasLikedToday = await storage.hasLikedTrackToday(uid, trackId);
      return res.json({ ...withComments, viewerHasLikedToday });
    }
    res.json(withComments);
  });

  app.post("/api/tracks/:id/claim-request", isAuthenticated, async (req: any, res) => {
    const p = await storage.getProfileByUserId(getUserId(req));
    if (!p || p.role !== "creator") {
      return res.status(403).json({
        message: apiMsg(
          "승인된 크리에이터만 소유권을 요청할 수 있습니다",
          "Only approved creators can request track ownership",
        ),
      });
    }
    const id = Number(req.params.id);
    const claimInfo = typeof req.body?.claimInfo === "string" ? req.body.claimInfo.trim() : "";
    if (claimInfo.length < 10) {
      return res.status(400).json({
        message: apiMsg(
          "아티스트 확인 정보를 10자 이상 입력해 주세요",
          "Please provide at least 10 characters for artist verification info",
        ),
      });
    }
    const r = await storage.createTrackClaimRequest(id, p.id);
    if (r.duplicate) {
      return res.status(409).json({
        message: apiMsg("이미 대기 중인 요청이 있습니다", "A pending request already exists"),
      });
    }
    if (!r.created) {
      return res.status(400).json({
        message: apiMsg(
          "이 트랙은 소유권 주장을 받지 않거나 이미 귀하의 트랙입니다",
          "This track cannot be claimed or is already yours",
        ),
      });
    }
    await storage.addComment(getUserId(req), id, `[CLAIM INFO] ${claimInfo}`);
    res.json({ ok: true });
  });

  app.post("/api/tracks/:id/claim-instant", isAuthenticated, async (req: any, res) => {
    const p = await storage.getProfileByUserId(getUserId(req));
    if (!p || p.role !== "creator") {
      return res.status(403).json({
        message: apiMsg(
          "승인된 크리에이터만 소유권을 이전받을 수 있습니다",
          "Only approved creators can claim track ownership",
        ),
      });
    }
    const secret = typeof req.body?.secret === "string" ? req.body.secret : "";
    const out = await storage.claimTrackWithSecret(Number(req.params.id), p.id, secret);
    if (!out.ok) {
      if (out.reason === "invalid_secret") {
        return res.status(403).json({
          message: apiMsg("유효하지 않은 코드입니다", "Invalid claim code"),
          reason: out.reason,
        });
      }
      return res.status(400).json({
        message: apiMsg("소유권을 이전할 수 없습니다", "Unable to claim this track"),
        reason: out.reason,
      });
    }
    res.json({ ok: true });
  });

  app.get("/api/tracks/my/battle-summaries", isAuthenticated, async (req: any, res) => {
    const p = await storage.getProfileByUserId(getUserId(req));
    if (!p) {
      return res.status(404).json({ message: apiMsg("프로필을 찾을 수 없습니다", "Profile not found") });
    }
    const rows = await storage.getLatestBattleSummariesForCreatorProfile(p.id);
    res.json(rows);
  });

  app.patch("/api/tracks/:id", isAuthenticated, async (req: any, res) => {
    const id = Number(req.params.id);
    const body = req.body ?? {};
    const admin = await isAdmin(req);

    if (!admin) {
      if (!(await assertTrackOwnerOrAdmin(req, res, id))) return;

      const definedKeys = (Object.keys(body) as string[]).filter((k) => body[k] !== undefined);
      const disallowed = definedKeys.filter((k) => k !== "aiPrompt");
      if (disallowed.length > 0) {
        return res.status(403).json({
          message: apiMsg(
            "크리에이터는 곡 설명·프롬프트(창작 의도)만 직접 수정할 수 있습니다. 그 외 항목은 Request edit로 관리자에게 요청해 주세요",
            "Creators may only update artistic intent & prompts here. Use Request edit for other metadata changes.",
          ),
        });
      }
      if (!definedKeys.includes("aiPrompt")) {
        return res.status(400).json({
          message: apiMsg(
            "창작 의도 필드(aiPrompt)를 보내 주세요",
            "Include the aiPrompt field to update artistic intent & prompts.",
          ),
        });
      }

      const track = await storage.getTrack(id);
      if (!track) {
        return res.status(404).json({ message: apiMsg("트랙을 찾을 수 없습니다", "Track not found") });
      }

      const intentTrim = typeof body.aiPrompt === "string" ? body.aiPrompt.trim() : "";
      if (intentTrim.length < MIN_TRACK_ARTISTIC_INTENT_CHARS) {
        return res.status(400).json({
          message: apiMsg(
            `창작 의도 및 프롬프트는 최소 ${MIN_TRACK_ARTISTIC_INTENT_CHARS}자 이상이어야 합니다`,
            `Artistic intent & prompt must be at least ${MIN_TRACK_ARTISTIC_INTENT_CHARS} characters`,
          ),
        });
      }
      if (intentTrim.length > MAX_TRACK_ARTISTIC_INTENT_CHARS) {
        return res.status(400).json({
          message: apiMsg(
            "창작 의도 및 프롬프트가 허용된 최대 길이를 초과했습니다",
            "Artistic intent & prompt is too long",
          ),
        });
      }
      if (looksLikeGibberish(intentTrim)) {
        return res.status(400).json({
          message: apiMsg(
            "무의미한 반복/도배 텍스트는 등록할 수 없습니다. 창작 의도를 자연어로 작성해 주세요",
            "Gibberish or repetitive spam text is not allowed. Please describe your artistic intent in natural language.",
          ),
        });
      }

      const prev = (track.aiPrompt ?? "").trim();
      if (intentTrim === prev) {
        const unchanged = await storage.getTrack(id);
        if (!unchanged) {
          return res.status(404).json({ message: apiMsg("트랙을 찾을 수 없습니다", "Track not found") });
        }
        return res.json(unchanged);
      }

      const editCount = track.aiPromptEditCount ?? 0;
      if (editCount >= MAX_CREATOR_AI_PROMPT_EDITS) {
        return res.status(403).json({
          message: apiMsg(
            "창작 의도·프롬프트는 최초 등록 후 최대 2회까지만 수정할 수 있습니다",
            "Artistic intent & prompt can be edited at most 2 times after the track is registered.",
          ),
        });
      }
      if (editCount >= 1 && track.aiPromptLastEditedAt) {
        const ms = HOURS_BETWEEN_CREATOR_AI_PROMPT_EDITS * 60 * 60 * 1000;
        const elapsed = Date.now() - new Date(track.aiPromptLastEditedAt).getTime();
        if (elapsed < ms) {
          const hoursLeft = Math.max(1, Math.ceil((ms - elapsed) / (60 * 60 * 1000)));
          return res.status(403).json({
            message: apiMsg(
              `다음 수정까지 약 ${hoursLeft}시간 남았습니다 (첫 수정 후 ${HOURS_BETWEEN_CREATOR_AI_PROMPT_EDITS}시간 간격)`,
              `Next prompt edit available in about ${hoursLeft} hour(s) (${HOURS_BETWEEN_CREATOR_AI_PROMPT_EDITS}h after your last edit).`,
            ),
          });
        }
      }

      const updated = await storage.updateTrackMetadata(id, {
        aiPrompt: intentTrim,
        bumpAiPromptEditStats: true,
      });
      if (!updated) {
        return res.status(404).json({ message: apiMsg("트랙을 찾을 수 없습니다", "Track not found") });
      }
      return res.json(updated);
    }

    if (!(await assertTrackAdmin(req, res))) return;

    const { title, artistName, genre, coverImageUrl, audioUrl, mvUrl, aiPrompt } = body;

    const updates: {
      title?: string;
      artistName?: string | null;
      genre?: string;
      coverImageUrl?: string | null;
      audioUrl?: string;
      mvUrl?: string | null;
      aiPrompt?: string | null;
    } = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({
          message: apiMsg("제목은 비어 있을 수 없습니다", "title must be a non-empty string"),
        });
      }
      updates.title = title.trim();
    }
    if (artistName !== undefined) {
      if (typeof artistName !== "string" || !artistName.trim()) {
        return res.status(400).json({
          message: apiMsg("아티스트명은 비어 있을 수 없습니다", "artistName must be a non-empty string"),
        });
      }
      updates.artistName = artistName.trim();
    }
    if (genre !== undefined) {
      if (typeof genre !== "string" || !validGenres.includes(genre)) {
        return res.status(400).json({ message: apiMsg("유효하지 않은 장르입니다", "Invalid genre") });
      }
      updates.genre = genre;
    }
    if (coverImageUrl !== undefined) {
      if (coverImageUrl === null || coverImageUrl === "") {
        updates.coverImageUrl = null;
      } else if (typeof coverImageUrl === "string") {
        const s = coverImageUrl.trim();
        if (!s) {
          updates.coverImageUrl = null;
        } else {
          try {
            const u = new URL(s);
            if (u.protocol !== "http:" && u.protocol !== "https:") {
              return res.status(400).json({
                message: apiMsg("커버 이미지 URL은 http(s)여야 합니다", "cover image URL must be http(s)"),
              });
            }
            updates.coverImageUrl = s;
          } catch {
            return res.status(400).json({
              message: apiMsg("유효하지 않은 커버 이미지 URL입니다", "Invalid cover image URL"),
            });
          }
        }
      } else {
        return res.status(400).json({
          message: apiMsg("coverImageUrl은 문자열이거나 null이어야 합니다", "coverImageUrl must be a string or null"),
        });
      }
    }
    if (audioUrl !== undefined) {
      if (typeof audioUrl !== "string" || !audioUrl.trim()) {
        return res.status(400).json({
          message: apiMsg("스트리밍 링크는 비어 있을 수 없습니다", "Stream/track link must be a non-empty URL"),
        });
      }
      const s = audioUrl.trim();
      try {
        const u = new URL(s);
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          return res.status(400).json({
            message: apiMsg("스트리밍 링크는 http(s)여야 합니다", "Stream link must be http(s)"),
          });
        }
        updates.audioUrl = s;
      } catch {
        return res.status(400).json({
          message: apiMsg("유효하지 않은 스트리밍 링크입니다", "Invalid stream/track URL"),
        });
      }
    }
    if (mvUrl !== undefined) {
      if (mvUrl === null || mvUrl === "") {
        updates.mvUrl = null;
      } else if (typeof mvUrl === "string") {
        const s = mvUrl.trim();
        if (!s) {
          updates.mvUrl = null;
        } else {
          try {
            const u = new URL(s);
            if (u.protocol !== "http:" && u.protocol !== "https:") {
              return res.status(400).json({
                message: apiMsg("뮤직비디오 URL은 http(s)여야 합니다", "Music video URL must be http(s)"),
              });
            }
            updates.mvUrl = s;
          } catch {
            return res.status(400).json({
              message: apiMsg("유효하지 않은 뮤직비디오 URL입니다", "Invalid music video URL"),
            });
          }
        }
      } else {
        return res.status(400).json({
          message: apiMsg("mvUrl은 문자열이거나 null이어야 합니다", "mvUrl must be a string or null"),
        });
      }
    }
    if (aiPrompt !== undefined) {
      if (aiPrompt === null || aiPrompt === "") {
        updates.aiPrompt = null;
      } else if (typeof aiPrompt === "string") {
        const intentTrim = aiPrompt.trim();
        if (!intentTrim) {
          updates.aiPrompt = null;
        } else {
          if (intentTrim.length < MIN_TRACK_ARTISTIC_INTENT_CHARS) {
            return res.status(400).json({
              message: apiMsg(
                `창작 의도 및 프롬프트는 최소 ${MIN_TRACK_ARTISTIC_INTENT_CHARS}자 이상이어야 합니다`,
                `Artistic intent & prompt must be at least ${MIN_TRACK_ARTISTIC_INTENT_CHARS} characters`,
              ),
            });
          }
          if (intentTrim.length > MAX_TRACK_ARTISTIC_INTENT_CHARS) {
            return res.status(400).json({
              message: apiMsg(
                "창작 의도 및 프롬프트가 허용된 최대 길이를 초과했습니다",
                "Artistic intent & prompt is too long",
              ),
            });
          }
          if (looksLikeGibberish(intentTrim)) {
            return res.status(400).json({
              message: apiMsg(
                "무의미한 반복/도배 텍스트는 등록할 수 없습니다. 창작 의도를 자연어로 작성해 주세요",
                "Gibberish or repetitive spam text is not allowed. Please describe your artistic intent in natural language.",
              ),
            });
          }
          updates.aiPrompt = intentTrim;
        }
      } else {
        return res.status(400).json({
          message: apiMsg("aiPrompt는 문자열이거나 null이어야 합니다", "aiPrompt must be a string or null"),
        });
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: apiMsg("업데이트할 유효한 필드가 없습니다", "No valid fields to update"),
      });
    }

    const updated = await storage.updateTrackMetadata(id, updates);
    if (!updated) return res.status(404).json({ message: apiMsg("트랙을 찾을 수 없습니다", "Track not found") });
    res.json(updated);
  });

  app.delete("/api/tracks/:id", async (req: any, res) => {
    const id = Number(req.params.id);
    if (!(await assertTrackAdmin(req, res))) return;
    if (!(await isAdmin(req))) {
      const track = await storage.getTrack(id);
      if (!track) return res.status(404).json({ message: apiMsg("트랙을 찾을 수 없습니다", "Track not found") });
      const minAgeMs = MIN_ACTIVE_HOURS * 60 * 60 * 1000;
      const ageMs = Date.now() - new Date(track.createdAt).getTime();
      if (ageMs < minAgeMs) {
        const remainingHours = Math.ceil((minAgeMs - ageMs) / (60 * 60 * 1000));
        return res.status(409).json({
          message: apiMsg(
            `최소 ${MIN_ACTIVE_HOURS}시간 활성 유지 후 아카이브할 수 있습니다. 약 ${remainingHours}시간 후 가능합니다`,
            `Minimum active time is ${MIN_ACTIVE_HOURS} hours. You can archive this track in about ${remainingHours} hour(s).`,
          ),
        });
      }
    }

    const ok = await storage.deleteTrack(id);
    if (!ok) return res.status(404).json({ message: apiMsg("트랙을 찾을 수 없습니다", "Track not found") });
    res.json({ message: apiMsg("트랙이 아카이브되었습니다", "Archived") });
  });

  app.post("/api/tracks/:id/edit-request", isAuthenticated, async (req: any, res) => {
    const id = Number(req.params.id);
    const detail = typeof req.body?.detail === "string" ? req.body.detail.trim() : "";
    const proposedLink = typeof req.body?.proposedLink === "string" ? req.body.proposedLink.trim() : "";
    if (!detail || detail.length < 10) {
      return res.status(400).json({
        message: apiMsg(
          "수정 요청 내용을 10자 이상 작성해 주세요",
          "Please provide at least 10 characters for the edit request",
        ),
      });
    }
    if (proposedLink) {
      try {
        const u = new URL(proposedLink);
        if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad_protocol");
      } catch {
        return res.status(400).json({
          message: apiMsg("수정 링크는 유효한 http(s) URL이어야 합니다", "Replacement link must be a valid http(s) URL"),
        });
      }
    }
    const profile = await storage.getProfileByUserId(getUserId(req));
    const track = await storage.getTrack(id);
    if (!profile || !track) {
      return res.status(404).json({ message: apiMsg("대상 정보를 찾을 수 없습니다", "Target not found") });
    }
    if (profile.id !== track.creatorId && !(await isAdmin(req))) {
      return res.status(403).json({
        message: apiMsg(
          "본인 트랙에 대해서만 수정 요청할 수 있습니다",
          "You can only request edits for your own tracks",
        ),
      });
    }
    const comment = proposedLink
      ? `[EDIT REQUEST] ${detail}\n[PROPOSED LINK] ${proposedLink}`
      : `[EDIT REQUEST] ${detail}`;
    await storage.addComment(getUserId(req), id, comment);
    res.json({ message: apiMsg("수정 요청이 관리자에게 전달되었습니다", "Edit request sent to admin") });
  });

  // Get current creator's own tracks
  app.get("/api/tracks/my", isAuthenticated, async (req: any, res) => {
    const p = await storage.getProfileByUserId(getUserId(req));
    if (!p) return res.status(404).json({ message: apiMsg("프로필을 찾을 수 없습니다", "Profile not found") });
    const ts = await storage.getTracksByCreator(p.id);
    const formatted = ts.map((t) => ({
      id: t.id,
      title: t.title,
      creatorName: t.artistName || t.creator.username,
      creatorId: t.creatorId,
      aiTool: t.aiTool,
      genre: t.genre,
      lyrics: t.lyrics,
      votes: t.listenerVotes,
      audioUrl: t.audioUrl,
      musicVideoUrl: t.mvUrl,
      coverImageUrl: t.coverImageUrl,
      description: t.description,
      aiCraftScore: t.aiCraftScore,
      neoScore: t.neoScore,
      playCount: t.playCount,
      rankingScore: t.rankingScore,
      trackType: t.trackType,
      status: t.status,
      winStreak: t.winStreak,
      aiPrompt: t.aiPrompt,
      aiPromptEditCount: t.aiPromptEditCount,
      aiPromptLastEditedAt: t.aiPromptLastEditedAt,
      createdAt: t.createdAt,
      likesCount: t.likesCount ?? 0,
    }));
    res.json(formatted);
  });

  app.post(api.tracks.create.path, async (req: any, res) => {
    const isPublicSubmitPayload =
      typeof req.body?.trackLink === "string" || typeof req.body?.artistName === "string";
    if (isPublicSubmitPayload) {
      await submitPublicTrack(req, res);
      return;
    }

    if (!req.isAuthenticated?.()) {
      return res.status(401).json({ message: apiMsg("인증이 필요합니다", "Unauthorized") });
    }

    const p = await storage.getProfileByUserId(getUserId(req));
    if (!p || (!(await isAdmin(req)) && p.role !== "creator")) {
      return res.status(403).json({
        message: apiMsg("승인된 크리에이터만 업로드할 수 있습니다", "Only approved creators can upload"),
      });
    }
    if (!(await isAdmin(req))) {
      if (!(await assertCreatorCanPublishAnotherTrack(req, res, p.id))) return;
    }

    const { title, aiTool, genre, audioUrl, mvUrl, coverImageUrl, coverImage, description, lyrics } = req.body;
    if (!title || !aiTool || !genre || !audioUrl) {
      return res.status(400).json({
        message: apiMsg(
          "제목, AI 도구, 장르, 오디오 URL은 필수입니다",
          "title, aiTool, genre, and audioUrl are required",
        ),
      });
    }

    const resolvedCover =
      typeof coverImageUrl === "string" && coverImageUrl.trim()
        ? coverImageUrl.trim()
        : typeof coverImage === "string" && coverImage.trim()
          ? coverImage.trim()
          : null;
    if (resolvedCover) {
      try {
        const u = new URL(resolvedCover);
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          return res.status(400).json({
            message: apiMsg("커버 이미지 URL은 http(s)여야 합니다", "cover image URL must be http(s)"),
          });
        }
      } catch {
        return res.status(400).json({
          message: apiMsg("유효하지 않은 커버 이미지 URL입니다", "Invalid cover image URL"),
        });
      }
    }

    const t = await storage.createTrack({
      title,
      aiTool,
      genre,
      audioUrl,
      mvUrl: mvUrl || null,
      coverImageUrl: resolvedCover,
      description: description || null,
      lyrics: lyrics || null,
      creatorId: p.id,
      status: "PENDING",
      aiCraftScore: 0,
      listenerVotes: 0,
      neoScore: 0,
    });
    res.status(201).json(t);
  });

  app.post(api.tracks.vote.path, isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: apiMsg("인증이 필요합니다", "Unauthorized") });
    }
    const trackId = Number(req.params.id);
    try {
      if (await canBypassVoteLimits(req)) {
        await db.delete(votes).where(and(eq(votes.userId, userId), eq(votes.trackId, trackId)));
      }
      await storage.voteTrack(userId, trackId);
      res.json({ message: apiMsg("투표가 기록되었습니다", "Vote recorded") });
    } catch (err: any) {
      if (err?.message === "ALREADY_VOTED") {
        return res.status(409).json({
          message: apiMsg("이미 이 트랙에 투표했습니다", "Already voted for this track"),
        });
      }
      throw err;
    }
  });

  // Record a play (requires 60s listen time enforced client-side; 10-min spam window enforced server-side)
  app.post("/api/tracks/:id/play", isAuthenticated, async (req: any, res) => {
    const userId = await persistSessionUser(req);
    if (!userId) {
      return res.status(401).json({ message: apiMsg("인증이 필요합니다", "Unauthorized") });
    }
    const trackId = Number(req.params.id);
    const completed = req.body?.completed === true;
    try {
      const result = await storage.recordPlay(userId, trackId, { completed });
      res.json({
        counted: result.counted,
        completionUpdated: result.completionUpdated,
        message: result.counted
          ? apiMsg("재생이 기록되었습니다", "Play recorded")
          : result.completionUpdated
            ? apiMsg("완주(완청)가 기록되었습니다", "Completion recorded")
            : apiMsg("재시도가 너무 빠릅니다 — 재생이 집계되지 않았습니다", "Too soon — play not counted"),
      });
    } catch (err: any) {
      console.error("[play] failed", {
        userId,
        trackId: req.params.id,
        code: err?.code,
        message: err?.message,
      });
      throw err;
    }
  });

  app.post(api.tracks.like.path, isAuthenticated, async (req: any, res) => {
    const userId = await persistSessionUser(req);
    if (!userId) {
      return res.status(401).json({ message: apiMsg("인증이 필요합니다", "Unauthorized") });
    }
    const trackId = Number(req.params.id);
    try {
      const { likesCount } = await storage.likeTrack(userId, trackId);
      res.json({
        message: apiMsg("좋아요를 반영했습니다", "Track liked"),
        likesCount,
        viewerHasLikedToday: true,
      });
    } catch (err: any) {
      if (err?.message === "ALREADY_LIKED_TODAY") {
        const t = await storage.getTrack(trackId);
        return res.status(409).json({
          message: apiMsg(
            "오늘은 이미 이 트랙을 응원했어요 (같은 트랙은 UTC 기준 하루 1회). 다른 곡은 같은 날에도 제한 없이 누를 수 있어요.",
            "You already cheered this track today (once per track per UTC day). Other songs can still be liked today — no shared daily cap.",
          ),
          likesCount: (t as { likesCount?: number } | null)?.likesCount ?? 0,
          viewerHasLikedToday: true,
        });
      }
      if (err?.message === "MISSING_USER_ID") {
        return res.status(401).json({ message: apiMsg("인증이 필요합니다", "Unauthorized") });
      }
      if (err?.message === "INVALID_TRACK_ID" || err?.message === "TRACK_NOT_FOUND") {
        return res.status(404).json({ message: apiMsg("트랙을 찾을 수 없습니다", "Track not found") });
      }
      if (err?.message === "USER_NOT_FOUND" || err?.message === "LIKE_INSERT_CONFLICT") {
        return res.status(401).json({
          message: apiMsg(
            "계정 정보를 불러오지 못했습니다. 로그아웃 후 다시 로그인해 주세요.",
            "Could not load your account. Please log out and sign in again.",
          ),
        });
      }
      console.error("[like] failed", {
        userId,
        trackId: req.params.id,
        code: err?.code ?? getPostgresSqlStateFromErr(err),
        message: err?.message,
      });
      let likesCount = 0;
      try {
        const t = await storage.getTrack(trackId);
        likesCount = Number((t as { likesCount?: number } | null)?.likesCount ?? 0);
      } catch {
        /* ignore */
      }
      return res.status(500).json({
        message: apiMsg(
          "잠시 후 다시 시도해 주세요. 계속되면 로그아웃 후 다시 로그인해 주세요.",
          "Please try again in a moment. If it keeps failing, log out and sign in again.",
        ),
        likesCount,
      });
    }
  });

  // Legacy submit endpoint: kept for backward compatibility
  app.post("/api/tracks/submit", async (req: any, res) => {
    await submitPublicTrack(req, res);
  });

  // RISING: audio tracks outside the chart top 100, ordered by play count (view engagement)
  app.get("/api/tracks/rising", async (_req, res) => {
    const q = (_req.query.q as string) || undefined;
    const rising = await storage.getRisingTracks(q);
    const trackIds = rising.map((r) => r.id);
    const commentCounts = await storage.getCommentCountsForTracks(trackIds);
    res.json(
      rising.map((row) =>
        sanitizePublicTrack({
          ...(row as Record<string, unknown>),
          commentsCount: commentCounts[row.id] ?? 0,
        }),
      ),
    );
  });

  const AVATAR_MAX_BYTES = 500 * 1024;

  function normalizeAvatarInput(raw: unknown): string | null | undefined {
    if (raw === undefined) return undefined;
    if (raw === null || raw === "") return null;
    if (typeof raw !== "string") throw new Error("INVALID_AVATAR");
    const s = raw.trim();
    if (!s) return null;
    if (s.startsWith("data:image/")) {
      const comma = s.indexOf(",");
      if (comma === -1) throw new Error("INVALID_AVATAR");
      const b64 = s.slice(comma + 1);
      const approxBytes = (b64.length * 3) / 4;
      if (approxBytes > AVATAR_MAX_BYTES) throw new Error("AVATAR_TOO_LARGE");
      return s;
    }
    try {
      const u = new URL(s);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("INVALID_AVATAR");
      return s;
    } catch {
      throw new Error("INVALID_AVATAR");
    }
  }

  app.get("/api/tracks/:id/comments", async (req, res) => {
    const trackId = Number(req.params.id);
    if (!Number.isFinite(trackId)) {
      return res.status(400).json({ message: apiMsg("잘못된 트랙 ID입니다", "Invalid track id") });
    }
    const rows = await storage.listTrackComments(trackId);
    res.json(
      rows.map((r) => ({
        id: r.id,
        content: r.content,
        createdAt: r.createdAt,
        authorName: r.authorName,
      })),
    );
  });

  app.post("/api/tracks/:id/comments", isAuthenticated, async (req: any, res) => {
    const trackId = Number(req.params.id);
    const content = req.body?.content;
    if (typeof content !== "string") {
      return res.status(400).json({ message: apiMsg("댓글 내용이 필요합니다", "content is required") });
    }
    try {
      await storage.addComment(getUserId(req), trackId, content);
      const commentCounts = await storage.getCommentCountsForTracks([trackId]);
      res.status(201).json({
        message: apiMsg("댓글이 등록되었습니다", "Comment posted"),
        commentsCount: commentCounts[trackId] ?? 0,
      });
    } catch (err: any) {
      const msg = err?.message;
      if (msg === "TRACK_NOT_FOUND") return res.status(404).json({ message: apiMsg("트랙을 찾을 수 없습니다", "Track not found") });
      if (msg === "EMPTY_COMMENT")
        return res.status(400).json({ message: apiMsg("댓글은 비울 수 없습니다", "Comment cannot be empty") });
      if (msg === "COMMENT_TOO_LONG")
        return res.status(400).json({ message: apiMsg("댓글이 너무 깁니다", "Comment too long") });
      throw err;
    }
  });

  // Update own profile (for editing country, bio, etc.)
  app.patch("/api/profiles/me", isAuthenticated, async (req: any, res) => {
    const p = await storage.getProfileByUserId(getUserId(req));
    if (!p) return res.status(404).json({ message: apiMsg("프로필을 찾을 수 없습니다", "Profile not found") });

    const { username, country, bio, aiToolUsed, avatarUrl } = req.body;
    const updates: any = {};
    if (username !== undefined) {
      const normalized = String(username).trim().toLowerCase();
      if (!/^[a-z0-9_]{3,24}$/.test(normalized)) {
        return res.status(400).json({
          message: apiMsg(
            "사용자명은 3~24자의 영문 소문자/숫자/언더스코어만 사용할 수 있습니다",
            "Username must be 3-24 chars and use only lowercase letters, numbers, and underscore",
          ),
        });
      }
      const existing = await storage.getProfileByUsername(normalized);
      if (existing && existing.id !== p.id) {
        return res.status(409).json({
          message: apiMsg("이미 사용 중인 사용자명입니다", "Username is already taken"),
        });
      }
      updates.username = normalized;
    }
    if (country !== undefined) updates.country = country;
    if (bio !== undefined) updates.bio = bio;
    if (aiToolUsed !== undefined) updates.aiToolUsed = aiToolUsed;
    if (avatarUrl !== undefined) {
      try {
        updates.avatarUrl = normalizeAvatarInput(avatarUrl);
      } catch (e: any) {
        const code = e?.message;
        if (code === "AVATAR_TOO_LARGE") {
          return res.status(400).json({
            message: apiMsg(
              `아바타는 최대 ${AVATAR_MAX_BYTES / 1024}KB까지 허용됩니다`,
              `Avatar must be at most ${AVATAR_MAX_BYTES / 1024}KB`,
            ),
          });
        }
        return res.status(400).json({
          message: apiMsg("유효하지 않은 아바타 URL 또는 이미지 데이터입니다", "Invalid avatar URL or image data"),
        });
      }
    }

    const updated = await storage.updateProfile(p.id, updates);
    const { userId: _um, ...pubM } = updated;
    res.json(pubM);
  });

  // --- BATTLE ROUTES ---

  // Get most recent battle (for Live Battle Arena on home page)
  app.get("/api/battles/recent", async (_req, res) => {
    try {
      const battle = await storage.getRecentBattle();
      res.json(sanitizeBattleForPublic(battle as Record<string, unknown> | null));
    } catch {
      res.json(null);
    }
  });

  // Get genres with enough published tracks for a battle
  app.get("/api/battles/genres", async (_req, res) => {
    const genres = await storage.getAvailableBattleGenres();
    res.json(genres);
  });

  app.get("/api/battles/daily-count", isAuthenticated, async (req: any, res) => {
    if (await canBypassVoteLimits(req)) {
      return res.json({ count: 0, dailyMax: MAX_BATTLE_ROUNDS });
    }
    const count = await storage.getDailyBattleVoteCount(getUserId(req));
    res.json({ count, dailyMax: MAX_BATTLE_ROUNDS });
  });

  app.get("/api/boost/me", isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    const profile = await storage.getProfileByUserId(userId);
    if (!profile) return res.status(404).json({ message: apiMsg("프로필을 찾을 수 없습니다", "Profile not found") });
    const ticketBalance = await storage.getBoostTicketBalance(profile.id);
    const logs = await storage.getActiveBoostLogsForOwner(profile.id);
    res.json({
      ticketBalance,
      logs,
    });
  });

  app.get("/api/boost/eligibility", isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    const profile = await storage.getProfileByUserId(userId);
    if (!profile) return res.status(404).json({ message: apiMsg("프로필을 찾을 수 없습니다", "Profile not found") });
    const trackId = Number(req.query?.trackId);
    if (!Number.isFinite(trackId)) {
      return res.status(400).json({ message: apiMsg("trackId가 필요합니다", "trackId is required") });
    }
    const out = await storage.checkBoostEligibility({ ownerProfileId: profile.id, trackId });
    res.json({
      eligible: out.eligible,
      reason: out.reason ?? null,
      cooldownUntil: out.cooldownUntil ? out.cooldownUntil.toISOString() : null,
      weeklyStartsUsed: out.weeklyStartsUsed,
      weeklyStartsMax: out.weeklyStartsMax,
      hasActiveBoost: out.hasActiveBoost,
    });
  });

  app.post("/api/boost/activate", isAuthenticated, async (req: any, res) => {
    const userId = getUserId(req);
    const profile = await storage.getProfileByUserId(userId);
    if (!profile) return res.status(404).json({ message: apiMsg("프로필을 찾을 수 없습니다", "Profile not found") });
    const trackId = Number(req.body?.trackId);
    if (!Number.isFinite(trackId)) {
      return res.status(400).json({ message: apiMsg("trackId가 필요합니다", "trackId is required") });
    }
    const out = await storage.activateBoostForTrack({
      ownerProfileId: profile.id,
      trackId,
      targetImpressions: Number(req.body?.targetImpressions) || 1000,
    });
    if (!out.ok) {
      const status =
        out.reason === "no_tickets"
          ? 402
          : out.reason === "already_active"
            ? 409
            : out.reason === "cooldown_active" || out.reason === "weekly_limit"
              ? 429
              : 400;
      return res.status(status).json({
        message: apiMsg("부스터를 시작할 수 없습니다", "Could not activate boost"),
        reason: out.reason,
        cooldownUntil: out.cooldownUntil ? out.cooldownUntil.toISOString() : null,
      });
    }
    res.json({ ok: true, usageLogId: out.usageLogId, remainingTickets: out.remainingTickets });
  });

  app.post("/api/boost/increment-impression", async (req: any, res) => {
    const trackId = Number(req.body?.trackId);
    if (!Number.isFinite(trackId)) {
      return res.status(400).json({ message: apiMsg("trackId가 필요합니다", "trackId is required") });
    }
    const sessionKey = req.sessionID ? String(req.sessionID) : null;
    const viewerUserId = req.user?.id ? String(req.user.id) : null;
    const out = await storage.incrementBoostImpression({ trackId, sessionKey, viewerUserId });
    res.json(out);
  });

  // Create a new battle for a given genre
  app.post("/api/battles/new", isAuthenticated, async (req: any, res) => {
    const { genre } = req.body;
    if (!genre) return res.status(400).json({ message: apiMsg("장르가 필요합니다", "genre is required") });

    if (!(await canBypassVoteLimits(req))) {
      const used = await storage.getDailyBattleVoteCount(getUserId(req));
      if (used >= MAX_BATTLE_ROUNDS) {
        return res.status(429).json({
          message: apiMsg("오늘 배틀 한도에 도달했습니다", "Daily battle limit reached"),
        });
      }
    }

    const userId = getUserId(req);
    const requesterProfile = await storage.getProfileByUserId(userId);
    const battle = await storage.createBattle(String(genre), {
      profileId: requesterProfile?.id ?? null,
      userId,
    });
    if (!battle) {
      return res.status(409).json({
        message: apiMsg(
          "오늘 이미 들은 곡을 제외하면 매칭할 트랙이 부족합니다. 다른 장르를 시도하거나 내일 다시 시도해 주세요",
          "Not enough tracks for a new match-up after excluding songs you already heard today. Try another genre or come back tomorrow.",
        ),
      });
    }

    res.json(sanitizeBattleForPublic(battle as Record<string, unknown>));
  });

  // Get a specific battle
  app.get("/api/battles/:id", async (req, res) => {
    const battle = await storage.getBattle(Number(req.params.id));
    if (!battle) return res.status(404).json({ message: apiMsg("배틀을 찾을 수 없습니다", "Battle not found") });
    res.json(sanitizeBattleForPublic(battle as Record<string, unknown>));
  });

  // After finishing a battle track preview (client-enforced duration); server records eligibility to vote.
  app.post("/api/battles/:id/listen-complete", isAuthenticated, async (req: any, res) => {
    const battleId = Number(req.params.id);
    const { trackId } = req.body;
    if (!trackId) {
      return res.status(400).json({ message: apiMsg("trackId가 필요합니다", "trackId is required") });
    }
    try {
      await storage.recordBattleListenComplete(battleId, getUserId(req), Number(trackId));
      res.json({ ok: true });
    } catch (err: any) {
      if (err?.message === "BATTLE_NOT_FOUND")
        return res.status(404).json({ message: apiMsg("배틀을 찾을 수 없습니다", "Battle not found") });
      if (err?.message === "TRACK_NOT_IN_BATTLE")
        return res.status(400).json({ message: apiMsg("이 배틀의 곡이 아닙니다", "Track is not in this battle") });
      throw err;
    }
  });

  // Vote in a battle
  app.post("/api/battles/:id/vote", isAuthenticated, async (req: any, res) => {
    const battleId = Number(req.params.id);
    const { trackId } = req.body;
    if (!trackId) return res.status(400).json({ message: apiMsg("trackId가 필요합니다", "trackId is required") });
    try {
      const userId = getUserId(req);
      const bypass = await canBypassVoteLimits(req);
      if (!bypass) {
        const used = await storage.getDailyBattleVoteCount(userId);
        if (used >= MAX_BATTLE_ROUNDS) {
          return res.status(429).json({
          message: apiMsg("오늘 배틀 한도에 도달했습니다", "Daily battle limit reached"),
        });
        }
      }
      if (bypass) {
        await db.delete(battleVotes).where(and(eq(battleVotes.userId, userId), eq(battleVotes.battleId, battleId)));
      }
      const result = await storage.recordBattleVote(battleId, userId, Number(trackId), { skipListenCheck: bypass });
      res.json(result);
    } catch (err: any) {
      if (err?.message === "ALREADY_VOTED")
        return res.status(409).json({
          message: apiMsg("이미 이 배틀에 투표했습니다", "Already voted in this battle"),
        });
      if (err?.message === "BATTLE_NOT_FOUND")
        return res.status(404).json({ message: apiMsg("배틀을 찾을 수 없습니다", "Battle not found") });
      if (err?.message === "BATTLE_LISTEN_INCOMPLETE")
        return res.status(400).json({
          message: apiMsg(
            "양쪽 트랙 프리뷰를 모두 들은 뒤 투표할 수 있습니다",
            "Listen to both tracks before voting",
          ),
        });
      if (err?.message === "TRACK_NOT_IN_BATTLE")
        return res.status(400).json({ message: apiMsg("이 배틀의 곡이 아닙니다", "Track is not in this battle") });
      throw err;
    }
  });

  // POST /api/vote — shorthand endpoint for battle voting (battleId + trackId in body)
  app.post("/api/vote", isAuthenticated, async (req: any, res) => {
    const { battleId, trackId } = req.body;
    if (!battleId || !trackId)
      return res.status(400).json({
        message: apiMsg("battleId와 trackId가 모두 필요합니다", "battleId and trackId are required"),
      });
    try {
      const parsedBattleId = Number(battleId);
      const parsedTrackId = Number(trackId);
      const userId = getUserId(req);
      const bypass = await canBypassVoteLimits(req);
      if (!bypass) {
        const used = await storage.getDailyBattleVoteCount(userId);
        if (used >= MAX_BATTLE_ROUNDS) {
          return res.status(429).json({
          message: apiMsg("오늘 배틀 한도에 도달했습니다", "Daily battle limit reached"),
        });
        }
      }
      if (bypass) {
        await db.delete(battleVotes).where(and(eq(battleVotes.userId, userId), eq(battleVotes.battleId, parsedBattleId)));
      }
      const result = await storage.recordBattleVote(parsedBattleId, userId, parsedTrackId, { skipListenCheck: bypass });
      res.json(result);
    } catch (err: any) {
      if (err?.message === "ALREADY_VOTED")
        return res.status(409).json({
          message: apiMsg("이미 이 배틀에 투표했습니다", "Already voted in this battle"),
        });
      if (err?.message === "BATTLE_NOT_FOUND")
        return res.status(404).json({ message: apiMsg("배틀을 찾을 수 없습니다", "Battle not found") });
      if (err?.message === "BATTLE_LISTEN_INCOMPLETE")
        return res.status(400).json({
          message: apiMsg(
            "양쪽 트랙 프리뷰를 모두 들은 뒤 투표할 수 있습니다",
            "Listen to both tracks before voting",
          ),
        });
      if (err?.message === "TRACK_NOT_IN_BATTLE")
        return res.status(400).json({ message: apiMsg("이 배틀의 곡이 아닙니다", "Track is not in this battle") });
      throw err;
    }
  });

  // GET /api/creators — studio roles plus profiles with at least one chart/NEW-eligible track
  app.get("/api/creators", async (_req, res) => {
    const creators = await storage.getCreators();
    res.json(creators.map((p) => sanitizePublicProfileForDirectory(p)));
  });

  /** Creator grid with chart-aligned play / battle stats (single source of truth). */
  app.get("/api/creators/directory", async (_req, res) => {
    const rows = await storage.getCreatorDirectoryEntries();
    res.json(rows);
  });

  // Live stats for today
  app.get("/api/stats/today", async (_req, res) => {
    const stats = await storage.getTodayStats();
    res.json(stats);
  });

  // Admin: requires authenticated user whose profile role is admin
  app.get("/api/admin/check", isAuthenticated, async (req: any, res) => {
    const admin = await isAdmin(req);
    if (!admin) return res.status(403).json({ message: apiMsg("관리자 권한이 필요합니다", "Admin access required") });
    res.json({ isAdmin: true });
  });

  app.get("/api/admin/insights", isAuthenticated, async (req: any, res) => {
    if (!(await isAdmin(req))) {
      return res.status(403).json({ message: apiMsg("관리자 권한이 필요합니다", "Admin access required") });
    }
    const out = await storage.getAdminInsightsSnapshot();
    res.json(out);
  });

  // Admin: get all submitted tracks across all pipeline statuses
  app.get("/api/admin/submissions", isAuthenticated, async (req: any, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ message: apiMsg("관리자 권한이 필요합니다", "Admin access required") });

    const statuses = [
      "PENDING",
      "SUBMITTED",
      "BATTLE_POOL",
      "APPROVED",
      "PUBLISHED",
      "REJECTED",
      "CHART",
      "MV",
    ];
    const all: any[] = [];
    for (const status of statuses) {
      const ts = await storage.getTracks({ status });
      all.push(
        ...ts.map((t) => ({
          id: t.id,
          title: t.title,
          creatorName: t.artistName || t.creator.username,
          creatorId: t.creatorId,
          genre: t.genre,
          trackLink: t.audioUrl,
          portfolioLink: t.description,
          trackType: t.trackType,
          status: t.status,
          createdAt: t.createdAt,
        }))
      );
    }
    const byId = new Map<number, (typeof all)[number]>();
    for (const row of all) {
      if (!byId.has(row.id)) byId.set(row.id, row);
    }
    const deduped = [...byId.values()];
    deduped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(deduped);
  });

  app.post(api.admin.review.path, isAuthenticated, async (req: any, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ message: apiMsg("관리자 권한이 필요합니다", "Admin access required") });

    const { status } = req.body;
    const validStatuses = ["BATTLE_POOL", "REJECTED", "PUBLISHED", "MV"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: apiMsg(
          "유효하지 않은 상태입니다. BATTLE_POOL, REJECTED, PUBLISHED, MV 중 하나여야 합니다",
          "Invalid status. Must be BATTLE_POOL, REJECTED, PUBLISHED, or MV",
        ),
      });
    }

    const reviewedTrackId = Number(req.params.id);
    await storage.updateTrackStatus(
      reviewedTrackId,
      status,
      req.body.aiCraftScore,
    );
    void storage.notifyTrackReviewed(reviewedTrackId, status).catch(() => {});
    if (status === "BATTLE_POOL" || status === "PUBLISHED" || status === "MV") {
      const reviewedTrack = await storage.getTrack(reviewedTrackId);
      const profileId = reviewedTrack?.creatorId;
      if (profileId) {
        const reviewedProfile = await storage.getProfile(profileId);
        if (reviewedProfile && reviewedProfile.role === "listener") {
          await storage.updateProfile(reviewedProfile.id, {
            role: "creator",
            creatorApplicationStatus: "none",
          });
        }
      }
    }
    res.json({ message: apiMsg("검토가 완료되었습니다", "Review completed") });
  });

  app.get("/api/admin/creator-applications", isAuthenticated, async (req: any, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ message: apiMsg("관리자 권한이 필요합니다", "Admin access required") });
    const rows = await storage.getPendingCreatorApplications();
    res.json(
      rows.map(({ profile, email }) => ({
        profileId: profile.id,
        username: profile.username,
        email,
        country: profile.country,
        aiToolUsed: profile.aiToolUsed,
        bio: profile.bio,
      })),
    );
  });

  app.post("/api/admin/creators/deactivate", isAuthenticated, async (req: any, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ message: apiMsg("관리자 권한이 필요합니다", "Admin access required") });
    const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
    if (!username) {
      return res.status(400).json({
        message: apiMsg("비활성화할 크리에이터 username을 입력해 주세요", "Creator username is required"),
      });
    }

    const result = await storage.deactivateCreatorByUsername(username);
    if (!result.ok) {
      if (result.reason === "NOT_FOUND") {
        return res.status(404).json({ message: apiMsg("해당 username의 프로필을 찾을 수 없습니다", "Creator profile not found") });
      }
      if (result.reason === "PROTECTED_ROLE") {
        return res.status(400).json({ message: apiMsg("admin/founder 계정은 비활성화할 수 없습니다", "Cannot deactivate admin/founder profile") });
      }
      return res.status(400).json({ message: apiMsg("비활성화 요청을 처리할 수 없습니다", "Could not deactivate creator") });
    }

    res.json({
      ok: true,
      profileId: result.profileId,
      archivedTrackCount: result.archivedTrackCount ?? 0,
      message: apiMsg("크리에이터를 비활성화하고 소유 트랙을 숨겼습니다", "Creator deactivated and owned tracks archived"),
    });
  });

  app.post("/api/admin/profiles/:id/approve-creator", isAuthenticated, async (req: any, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ message: apiMsg("관리자 권한이 필요합니다", "Admin access required") });
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: apiMsg("잘못된 프로필 ID입니다", "Invalid profile id") });
    const p = await storage.getProfile(id);
    if (!p) return res.status(404).json({ message: apiMsg("프로필을 찾을 수 없습니다", "Profile not found") });
    if (p.creatorApplicationStatus !== "pending") {
      return res.status(400).json({
        message: apiMsg(
          "이 프로필에 대기 중인 크리에이터 신청이 없습니다",
          "No pending creator application for this profile",
        ),
      });
    }
    const updated = await storage.updateProfile(id, {
      role: "creator",
      creatorApplicationStatus: "none",
    });
    const { userId: _ua, ...pubA } = updated;
    res.json(pubA);
  });

  app.post("/api/admin/profiles/:id/reject-creator", isAuthenticated, async (req: any, res) => {
    if (!(await isAdmin(req))) return res.status(403).json({ message: apiMsg("관리자 권한이 필요합니다", "Admin access required") });
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: apiMsg("잘못된 프로필 ID입니다", "Invalid profile id") });
    const p = await storage.getProfile(id);
    if (!p) return res.status(404).json({ message: apiMsg("프로필을 찾을 수 없습니다", "Profile not found") });
    if (p.creatorApplicationStatus !== "pending") {
      return res.status(400).json({
        message: apiMsg(
          "이 프로필에 대기 중인 크리에이터 신청이 없습니다",
          "No pending creator application for this profile",
        ),
      });
    }
    const updated = await storage.updateProfile(id, {
      role: "listener",
      creatorApplicationStatus: "rejected",
    });
    const { userId: _ur, ...pubR } = updated;
    res.json(pubR);
  });

  app.get("/api/admin/track-claim-requests", isAuthenticated, async (req: any, res) => {
    if (!(await isAdmin(req))) {
      return res.status(403).json({ message: apiMsg("관리자 권한이 필요합니다", "Admin access required") });
    }
    const rows = await storage.listPendingTrackClaimRequests();
    res.json(rows);
  });

  app.get("/api/admin/track-edit-requests", isAuthenticated, async (req: any, res) => {
    if (!(await isAdmin(req))) {
      return res.status(403).json({ message: apiMsg("관리자 권한이 필요합니다", "Admin access required") });
    }
    const rows = await storage.listPendingTrackEditRequests();
    res.json(rows);
  });

  app.delete("/api/admin/track-edit-requests/:commentId", isAuthenticated, async (req: any, res) => {
    if (!(await isAdmin(req))) {
      return res.status(403).json({ message: apiMsg("관리자 권한이 필요합니다", "Admin access required") });
    }
    const commentId = Number(req.params.commentId);
    if (!Number.isFinite(commentId)) {
      return res.status(400).json({ message: apiMsg("잘못된 댓글 ID입니다", "Invalid comment id") });
    }
    const ok = await storage.deleteTrackEditRequestComment(commentId);
    if (!ok) {
      return res.status(404).json({
        message: apiMsg("삭제할 수정 요청을 찾을 수 없습니다", "Edit request not found or cannot be deleted"),
      });
    }
    res.json({ ok: true });
  });

  app.post("/api/admin/track-claim-requests/:id/approve", isAuthenticated, async (req: any, res) => {
    if (!(await isAdmin(req))) {
      return res.status(403).json({ message: apiMsg("관리자 권한이 필요합니다", "Admin access required") });
    }
    const id = Number(req.params.id);
    const out = await storage.approveTrackClaimRequest(id);
    if (!out.ok) {
      return res.status(400).json({
        message: apiMsg("요청을 승인할 수 없습니다", "Unable to approve request"),
        reason: out.reason,
      });
    }
    res.json({ ok: true });
  });

  app.post("/api/admin/track-claim-requests/:id/reject", isAuthenticated, async (req: any, res) => {
    if (!(await isAdmin(req))) {
      return res.status(403).json({ message: apiMsg("관리자 권한이 필요합니다", "Admin access required") });
    }
    const id = Number(req.params.id);
    const ok = await storage.rejectTrackClaimRequest(id);
    if (!ok) {
      return res.status(400).json({ message: apiMsg("요청을 찾을 수 없습니다", "Request not found") });
    }
    res.json({ ok: true });
  });

  app.patch("/api/admin/tracks/:id/claimable", isAuthenticated, async (req: any, res) => {
    if (!(await isAdmin(req))) {
      return res.status(403).json({ message: apiMsg("관리자 권한이 필요합니다", "Admin access required") });
    }
    const id = Number(req.params.id);
    const claimable = req.body?.claimable;
    if (typeof claimable !== "boolean") {
      return res.status(400).json({
        message: apiMsg("claimable은 true/false여야 합니다", "claimable must be a boolean"),
      });
    }
    const updated = await storage.setTrackClaimableByCreators(id, claimable);
    if (!updated) {
      return res.status(404).json({ message: apiMsg("트랙을 찾을 수 없습니다", "Track not found") });
    }
    res.json({ ok: true, claimableByCreators: updated.claimableByCreators });
  });

  return httpServer;
}
