import type { Express, NextFunction, Request, Response } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import { pool } from "./db";
import { Strategy as GoogleStrategy, type Profile as GoogleProfile } from "passport-google-oauth20";
import type { User } from "@shared/models/auth";
import type { Profile } from "@shared/schema";
import { storage } from "./storage";
import {
  isCreatorProfileRole,
  isCreatorStudioRole,
  isFounderAdminEmail,
  NEX_FOUNDER_ADMIN_EMAIL,
} from "@shared/constants";
import { apiMsg } from "./api-i18n";

function founderEmailForEnv(): string {
  return (process.env.NEX_FOUNDER_ADMIN_EMAIL || NEX_FOUNDER_ADMIN_EMAIL).trim().toLowerCase();
}

export type SessionUser = {
  id: string;
  username?: string;
  role?: "admin" | "creator" | "listener" | string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
};

function deserializePayloadToUserId(payload: unknown): string | null {
  if (typeof payload === "string" && payload.length > 0) return payload;
  if (payload && typeof payload === "object" && "id" in payload) {
    const id = (payload as { id: unknown }).id;
    if (id != null && String(id).length > 0) return String(id);
  }
  return null;
}

function normalizeSessionRole(
  role: string | null | undefined,
  email: string | null | undefined,
): "admin" | "creator" | "listener" {
  if (isFounderAdminEmail(email, founderEmailForEnv())) return "admin";
  if (process.env.NODE_ENV !== "production" && role === "admin") return "admin";
  if (role === "creator") return "creator";
  if (role === "admin") return "listener";
  return "listener";
}

function buildSessionUserFromDbRow(row: User, profile: Profile | undefined): SessionUser {
  return {
    id: row.id,
    email: row.email ?? null,
    firstName: row.firstName ?? null,
    lastName: row.lastName ?? null,
    profileImageUrl: row.profileImageUrl ?? null,
    username: profile?.username,
    role: normalizeSessionRole(profile?.role, row.email ?? null),
  };
}

function hasGoogleEnv(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function isLocalDevBypassAllowed(req: Request): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const host = (req.get("host") || "").toLowerCase();
  return host.includes("localhost") || host.includes("127.0.0.1");
}

function parseDevRole(raw: unknown): "admin" | "creator" | "listener" {
  const role = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (role === "admin" || role === "creator") return role;
  return "listener";
}

async function ensureUniqueDevUsername(base: string, userId: string): Promise<string> {
  const seed = base.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || "dev_user";
  let candidate = seed.slice(0, 30);
  let n = 1;
  for (;;) {
    const existing = await storage.getProfileByUsername(candidate);
    if (!existing || existing.userId === userId) return candidate;
    n += 1;
    candidate = `${seed.slice(0, 24)}_${n}`;
  }
}

async function ensureDevProfile(userId: string, desiredRole: "admin" | "creator" | "listener") {
  const enforcedRole = desiredRole;
  const existing = await storage.getProfileByUserId(userId);
  if (existing) {
    if (existing.role !== enforcedRole) {
      return storage.updateProfile(existing.id, {
        role: enforcedRole,
        creatorApplicationStatus:
          enforcedRole === "admin" || enforcedRole === "creator" ? "none" : existing.creatorApplicationStatus,
      });
    }
    return existing;
  }
  const username = await ensureUniqueDevUsername(`dev_${enforcedRole}`, userId);
  return storage.createProfile({
    userId,
    username,
    role: enforcedRole,
    country: null,
    creatorApplicationStatus: "none",
  });
}

async function directLoginForLocalDev(
  req: Request,
  res: Response,
  next: NextFunction,
  returnTo: string,
) {
  try {
    const role = parseDevRole(req.query.role);
    const requestedId = typeof req.query.devUserId === "string" ? req.query.devUserId.trim() : "";
    const uid = requestedId || `dev-local-${role}`;
    const firstName = typeof req.query.firstName === "string" ? req.query.firstName.trim() : "Local";
    const lastName = typeof req.query.lastName === "string" ? req.query.lastName.trim() : "Developer";
    const email = `${uid}@local.dev`;

    await storage.upsertOAuthUser({
      id: uid,
      email,
      firstName,
      lastName,
      profileImageUrl: null,
    });
    const profile = await ensureDevProfile(uid, role);
    const persistedUser = await storage.getUserById(uid);
    if (!persistedUser) {
      return next(new Error("Failed to create local dev user"));
    }
    const sessionUser = buildSessionUserFromDbRow(persistedUser, profile);

    req.session.regenerate((sessionErr) => {
      if (sessionErr) return next(sessionErr);
      req.login(sessionUser, (loginErr) => {
        if (loginErr) return next(loginErr);
        req.session.save((saveErr) => {
          if (saveErr) return next(saveErr);
          res.redirect(returnTo);
        });
      });
    });
  } catch (e) {
    next(e);
  }
}

function getPublicOrigin(req: Request): string {
  const host = req.get("host") || `localhost:${process.env.PORT || "5001"}`;
  const forwardedProto = req.get("x-forwarded-proto");
  const proto = forwardedProto?.split(",")[0]?.trim() || req.protocol || "http";
  return `${proto}://${host}`;
}

function getCallbackURL(): string {
  const configured = process.env.GOOGLE_CALLBACK_URL?.trim();
  if (configured) return configured;

  // Default: keep in sync with Google Cloud Console Authorized redirect URI.
  return "http://localhost:5001/api/auth/google/callback";
}

/**
 * Google must see the same redirect_uri you started from (cookie host must match).
 * Allow nexmusic.ai, Railway `*.up.railway.app`, and local dev.
 */
function isOAuthCallbackOriginAllowed(origin: string): boolean {
  try {
    const u = new URL(origin);
    const host = u.hostname.toLowerCase();
    if (host === "nexmusic.ai" || host === "www.nexmusic.ai") {
      return u.protocol === "https:";
    }
    if (host.endsWith(".up.railway.app")) {
      return u.protocol === "https:";
    }
    if (host === "localhost" || host === "127.0.0.1") {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Per-request callback so OAuth returns to the same host the user is browsing (Railway vs nexmusic.ai). */
function resolveGoogleCallbackUrlForRequest(req: Request): string | null {
  const origin = getPublicOrigin(req);
  if (isOAuthCallbackOriginAllowed(origin)) {
    return `${origin}/api/auth/google/callback`;
  }
  const fixed = process.env.GOOGLE_CALLBACK_URL?.trim();
  if (fixed) return fixed;
  return null;
}

/** When OAuth did not store returnTo: creators → profile; listeners & admins → home (never force /submit-track). */
async function resolvePostLoginRedirect(user: SessionUser): Promise<string> {
  const uid = user.id != null ? String(user.id) : "";
  if (!uid) return "/";
  const profile = await storage.getProfileByUserId(uid);
  if (!profile) return "/";
  if (isCreatorProfileRole(profile.role)) return "/profile/me";
  return "/";
}

async function sessionUserMayAccessAdmin(user: SessionUser): Promise<boolean> {
  if (!user.id) return false;
  if (isFounderAdminEmail(user.email, founderEmailForEnv())) return true;
  const profile = await storage.getProfileByUserId(String(user.id));
  return profile?.role === "admin";
}

async function sessionUserMayAccessSubmitTrack(user: SessionUser): Promise<boolean> {
  if (!user.id) return false;
  return isCreatorStudioRole(user.role);
}

async function sanitizeOAuthRedirect(user: SessionUser, path: string): Promise<string> {
  if (path === "/admin" || path.startsWith("/admin/") || path.startsWith("/admin?")) {
    if (!(await sessionUserMayAccessAdmin(user))) return "/";
  }
  const isSubmitPath =
    path === "/submit-track" ||
    path.startsWith("/submit-track?") ||
    path === "/submit" ||
    path.startsWith("/submit?");
  if (isSubmitPath && !(await sessionUserMayAccessSubmitTrack(user))) {
    return "/";
  }
  return path;
}

function normalizeOAuthReturnTo(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//") || t.includes("://")) return null;
  if (t === "/auth" || t.startsWith("/auth?")) return "/";
  return t;
}

/** HTTPS sites must use Secure cookies. Override with SESSION_COOKIE_SECURE=0 only if you know why (not recommended). */
function sessionCookieSecure(): boolean {
  const raw = process.env.SESSION_COOKIE_SECURE?.trim().toLowerCase();
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return process.env.NODE_ENV === "production";
}

/** Express `trust proxy`: 1 hop default; set TRUST_PROXY=false to disable, true/all for all proxies, or a number. */
function parseTrustProxySetting(): boolean | number {
  const raw = process.env.TRUST_PROXY?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "off") return false;
  if (raw === "true" || raw === "on" || raw === "all") return true;
  if (raw && /^\d+$/.test(raw)) return Number.parseInt(raw, 10);
  // Railway (and similar) often chains multiple proxies; `1` can break req.protocol / cookies for OAuth.
  if (process.env.NODE_ENV === "production" && process.env.RAILWAY_ENVIRONMENT) {
    return true;
  }
  return 1;
}

function getSessionSecret(): string {
  if (process.env.NODE_ENV === "production") {
    const secret = process.env.SESSION_SECRET?.trim();
    if (!secret || secret === "nex-local-dev-secret") {
      throw new Error(
        "SESSION_SECRET must be set to a long random string in production (not the default dev value).",
      );
    }
    if (secret.length < 32) {
      throw new Error("SESSION_SECRET should be at least 32 characters in production.");
    }
    return secret;
  }
  return process.env.SESSION_SECRET?.trim() || "nex-local-dev-secret";
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", parseTrustProxySetting());

  const cookieSecure = sessionCookieSecure();

  const sessionBase = {
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
    name: "nex.sid",
    cookie: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: cookieSecure,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  };

  const PgSessionStore = connectPgSimple(session);
  const usePgStore =
    process.env.NODE_ENV === "production" && !!process.env.DATABASE_URL;

  app.use(
    session({
      ...sessionBase,
      ...(usePgStore
        ? {
            // Reuse Drizzle `sessions` table (@shared/models/auth.ts). It already has index
            // "IDX_session_expire"; connect-pg-simple's create script would duplicate that name
            // if we used another tableName + createTableIfMissing.
            store: new PgSessionStore({
              pool,
              tableName: "sessions",
              createTableIfMissing: false,
            }),
          }
        : {}),
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: unknown, cb) => {
    const id = deserializePayloadToUserId(user);
    if (!id) return cb(new Error("serializeUser: missing user id"));
    cb(null, id);
  });

  passport.deserializeUser((payload: unknown, cb) => {
    void (async () => {
      try {
        const id = deserializePayloadToUserId(payload);
        if (!id) return cb(null, false);
        const row = await storage.getUserById(id);
        if (!row) return cb(null, false);
        const profile = await storage.getProfileByUserId(id);
        cb(null, buildSessionUserFromDbRow(row, profile));
      } catch (e) {
        cb(e instanceof Error ? e : new Error(String(e)));
      }
    })();
  });

  // If Google env isn't present, still boot the server so non-auth endpoints
  // work; login endpoints return a clear auth error redirect.
  if (!hasGoogleEnv()) {
    return;
  }

  const callbackURL = getCallbackURL();

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL,
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: GoogleProfile,
        done,
      ) => {
        const email = profile.emails?.[0]?.value ?? null;
        const photo = profile.photos?.[0]?.value ?? null;
        const user: SessionUser = {
          id: String(profile.id),
          email,
          firstName: profile.name?.givenName ?? null,
          lastName: profile.name?.familyName ?? null,
          profileImageUrl: photo,
        };
        done(null, user);
      },
    ),
  );
}

export function registerAuthRoutes(app: Express) {
  const loginHandler = (req: Request, res: Response, next: NextFunction) => {
    const returnTo = normalizeOAuthReturnTo(req.query.returnTo) ?? "/";

    if (!hasGoogleEnv()) {
      if (isLocalDevBypassAllowed(req)) {
        void directLoginForLocalDev(req, res, next, returnTo);
        return;
      }
      return res.redirect("/?authError=google_not_configured");
    }
    (req.session as { oauthReturnTo?: string }).oauthReturnTo = returnTo;
    req.session.save((saveErr) => {
      if (saveErr) return next(saveErr);
      const callbackURL = resolveGoogleCallbackUrlForRequest(req);
      if (!callbackURL) {
        return res.redirect(`${getPublicOrigin(req)}/?authError=oauth_callback_misconfigured`);
      }
      // passport-oauth2 accepts callbackURL; @types/passport omit it.
      passport.authenticate("google", {
        scope: ["profile", "email"],
        session: true,
        callbackURL,
      } as Record<string, unknown>)(req, res, next);
    });
  };

  app.get("/api/auth/login", loginHandler);
  app.get("/api/login", loginHandler);

  app.get("/admin-login", (req, res) => {
    return res.redirect("/api/auth/login?returnTo=%2Fadmin");
  });

  const handleGoogleCallback = (req: Request, res: Response, next: NextFunction) => {
    if (!hasGoogleEnv()) {
      return res.redirect(`${getPublicOrigin(req)}/?authError=google_not_configured`);
    }

    const callbackURL = resolveGoogleCallbackUrlForRequest(req);
    if (!callbackURL) {
      return res.redirect(`${getPublicOrigin(req)}/?authError=oauth_callback_misconfigured`);
    }

    passport.authenticate("google", { session: true, callbackURL } as Record<string, unknown>, (err: unknown, user: SessionUser | false) => {
      if (err || !user) {
        const qErr = req.query.error;
        const qDesc = req.query.error_description;
        console.error(
          "[auth] Google callback failed:",
          err ?? "no user",
          typeof qErr === "string" ? `query.error=${qErr}` : "",
          typeof qDesc === "string" ? String(qDesc).slice(0, 200) : "",
        );
        return res.redirect(`${getPublicOrigin(req)}/?authError=oauth_failed`);
      }

      // Read stored return path before regenerating the session (regenerate clears the store).
      const fromOAuth = normalizeOAuthReturnTo(
        (req.session as { oauthReturnTo?: string }).oauthReturnTo,
      );

      void (async () => {
        try {
          await storage.upsertOAuthUser({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
          });

          // Session fixation: regenerate once, then req.login + persist session before redirect.
          req.session.regenerate((sessionErr) => {
            if (sessionErr) return next(sessionErr);

            req.login(user, async (loginErr) => {
              if (loginErr) return next(loginErr);

              try {
                await new Promise<void>((resolve, reject) => {
                  req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
                });

                const persistedUser = await storage.getUserById(user.id);
                const persistedProfile = await storage.getProfileByUserId(user.id);
                const hydrated = persistedUser
                  ? buildSessionUserFromDbRow(persistedUser, persistedProfile)
                  : user;
                const rawTarget = fromOAuth ?? (await resolvePostLoginRedirect(hydrated));
                const redirectPath = await sanitizeOAuthRedirect(hydrated, rawTarget);
                return res.redirect(redirectPath);
              } catch (profileOrSaveErr) {
                return next(profileOrSaveErr);
              }
            });
          });
        } catch (e) {
          next(e);
        }
      })();
    })(req, res, next);
  };

  app.get("/api/auth/google/callback", handleGoogleCallback);
  /** Alternate path (e.g. Google Console); must match `GOOGLE_CALLBACK_URL` exactly. */
  app.get("/api/auth/callback/google", handleGoogleCallback);
  app.get("/auth/callback", handleGoogleCallback);
  app.get("/api/callback", handleGoogleCallback);

  app.get("/api/logout", (req, res) => {
    req.logout(() => res.redirect("/"));
  });

  // Frontend expects this. Merge profile.role so UI can gate on user.role === "admin".
  app.get("/api/auth/user", async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ message: apiMsg("인증이 필요합니다", "Unauthorized") });
      const uid = String((req.user as SessionUser).id ?? "");
      const base = { ...(req.user as SessionUser) };
      if (uid) {
        const userRow = await storage.getUserById(uid);
        const email = userRow?.email ?? base.email ?? null;
        let profile = await storage.getProfileByUserId(uid);
        if (
          process.env.NODE_ENV === "production" &&
          profile?.role === "admin" &&
          !isFounderAdminEmail(email, founderEmailForEnv())
        ) {
          profile = await storage.updateProfile(profile.id, { role: "listener" });
        }
        if (isFounderAdminEmail(email, founderEmailForEnv()) && profile && profile.role !== "admin") {
          profile = await storage.updateProfile(profile.id, {
            role: "admin",
            creatorApplicationStatus: "none",
          });
        }
        const mergedRole = normalizeSessionRole(profile?.role, email);
        const { email: _em, id: _oauthSub, ...safeBase } = base;
        void _em;
        void _oauthSub;
        return res.json({
          ...safeBase,
          role: mergedRole,
          username: profile?.username ?? base.username,
          creatorApplicationStatus: profile?.creatorApplicationStatus ?? "none",
        });
      }
      const { email: _e2, id: _id2, ...safeOnly } = base;
      void _e2;
      void _id2;
      res.json(safeOnly);
    } catch (e) {
      next(e);
    }
  });
}

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.user) return next();
  return res.status(401).json({ message: apiMsg("인증이 필요합니다", "Unauthorized") });
};