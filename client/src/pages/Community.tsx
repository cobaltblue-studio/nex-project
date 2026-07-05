import { useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Heart,
  Lightbulb,
  Loader2,
  MessageSquare,
  Music2,
  PenLine,
  Pin,
  Share2,
  Sparkles,
  Swords,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { optimisticToggleLike, rollbackLike } from "@/lib/communityOptimistic";
import { CommunityPostPanel, type CommunityPost } from "@/components/CommunityPostPanel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_SYSTEM_AUTHOR_ID,
  COMMUNITY_SYSTEM_SEED_POSTS,
  formatCommunitySeedBody,
  formatCommunitySeedTitle,
  getCommunitySystemSeed,
  type CommunityCategorySlug,
} from "@shared/community";

type MeProfile = { id: number; username: string; role?: string } | null;
type PickTrack = { id: number; title: string; creatorName: string };

function toPickTrack(raw: { id: number; title: string; creatorName?: string }): PickTrack {
  return {
    id: raw.id,
    title: String(raw.title ?? "").trim(),
    creatorName: String(raw.creatorName ?? "").trim() || "?",
  };
}

function mergeAudioPickTracks(chartRows: PickTrack[], newRows: PickTrack[]): PickTrack[] {
  const seen = new Set<number>();
  const merged: PickTrack[] = [];
  for (const track of chartRows) {
    if (seen.has(track.id)) continue;
    seen.add(track.id);
    merged.push(track);
  }
  for (const track of newRows) {
    if (seen.has(track.id)) continue;
    seen.add(track.id);
    merged.push(track);
  }
  return merged;
}

async function fetchCommunityAudioPickOptions(search: string): Promise<PickTrack[]> {
  const q = search.trim();
  const chartParams = new URLSearchParams({
    sortBy: "rankingScore",
    limit: "100",
    trackType: "audio",
  });
  if (!q) chartParams.set("status", "CHART");
  else chartParams.set("q", q);

  const newUrl = q ? `/api/tracks/new?q=${encodeURIComponent(q)}` : "/api/tracks/new";
  const [chartRes, newRes] = await Promise.all([
    fetch(`/api/tracks?${chartParams.toString()}`),
    fetch(newUrl),
  ]);
  if (!chartRes.ok || !newRes.ok) throw new Error("Failed to load tracks");
  const chartRows = (await chartRes.json()) as { id: number; title: string; creatorName?: string }[];
  const newRows = (await newRes.json()) as { id: number; title: string; creatorName?: string }[];
  return mergeAudioPickTracks(chartRows.map(toPickTrack), newRows.map(toPickTrack));
}

async function fetchCommunityMvPickOptions(search: string): Promise<PickTrack[]> {
  const q = search.trim();
  const params = new URLSearchParams({
    sortBy: "rankingScore",
    limit: "100",
    trackType: "video",
  });
  if (!q) params.set("status", "MV");
  else params.set("q", q);
  const res = await fetch(`/api/tracks?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load music videos");
  const rows = (await res.json()) as { id: number; title: string; creatorName?: string }[];
  return rows.map(toPickTrack);
}

function formatCommunityTrackPickLabel(track: PickTrack): string {
  return `${track.title.trim()} · ${track.creatorName.trim()}`;
}

const CATEGORY_ICONS: Record<CommunityCategorySlug, typeof MessageSquare> = {
  "track-share": BookOpen,
  prompts: Sparkles,
  "battle-talk": Swords,
  "help-ideas": Lightbulb,
};

function formatRelativeTime(value: string, locale: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return locale.startsWith("ko") ? "방금" : "now";
  if (minutes < 60) return locale.startsWith("ko") ? `${minutes}분 전` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return locale.startsWith("ko") ? `${hours}시간 전` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return locale.startsWith("ko") ? `${days}일 전` : `${days}d`;
}

function excerpt(text: string, max = 280) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

function invalidateCommunityQueries() {
  return queryClient.invalidateQueries({
    predicate: (query) =>
      typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("/api/community/posts"),
  });
}

export default function Community() {
  const { i18n } = useTranslation();
  const isKorean = i18n.language?.startsWith("ko");
  const locale = i18n.language || "en";
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [matchPost, postParams] = useRoute("/community/:id");
  const detailPostId = matchPost && postParams?.id ? Number(postParams.id) : null;
  const detailOpen = detailPostId !== null && Number.isFinite(detailPostId) && detailPostId > 0;

  const [selectedCategory, setSelectedCategory] = useState<CommunityCategorySlug>("track-share");
  const [writeOpen, setWriteOpen] = useState(false);
  const [category, setCategory] = useState<CommunityCategorySlug>("track-share");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [attachedAudioTrackId, setAttachedAudioTrackId] = useState("");
  const [attachedMvTrackId, setAttachedMvTrackId] = useState("");

  const attachedTrackId = attachedAudioTrackId || attachedMvTrackId;

  const copy = useMemo(
    () =>
      isKorean
        ? {
            createTitle: "새 글 쓰기",
            bodyPlaceholder: "내용",
            loginNeeded: "글 작성과 좋아요, 댓글은 로그인 후 사용할 수 있습니다.",
            category: "카테고리",
            title: "제목",
            relatedAudioTrack: "관련곡 — NEW & TOP 100",
            relatedMv: "관련 Music Video",
            relatedTrackLoading: "목록 불러오는 중…",
            pickRequired: "관련 곡 또는 뮤직비디오를 선택해 주세요.",
            creatorNote: "크리에이터 노트",
            publish: "글 올리기",
            emptyFeed: "아직 글이 없습니다. 첫 글을 작성해 보세요.",
            like: "좋아요",
            comments: "댓글",
            share: "공유",
            pinned: "고정",
            hidden: "숨김",
            moderateHide: "숨기기",
            moderateUnhide: "숨김 해제",
            moderatePin: "고정",
            moderateUnpin: "고정 해제",
            openTrack: "관련 곡",
            needProfile: "커뮤니티 글을 쓰려면 먼저 프로필이 있어야 합니다.",
            loadingFeed: "불러오는 중…",
            topics: "카테고리",
            writePost: "글쓰기",
            postSuccess: "글이 등록되었습니다.",
            shareCopied: "링크를 복사했습니다.",
            latest: "최신순",
          }
        : {
            createTitle: "Create post",
            bodyPlaceholder: "Content",
            loginNeeded: "Login is required to post, like, and comment.",
            category: "Category",
            title: "Title",
            relatedAudioTrack: "Related track — NEW & TOP 100",
            relatedMv: "Related music video",
            relatedTrackLoading: "Loading…",
            pickRequired: "Please select a related track or music video.",
            creatorNote: "Creator note",
            publish: "Post",
            emptyFeed: "No posts yet. Be the first to write.",
            like: "Like",
            comments: "Comments",
            share: "Share",
            pinned: "Pinned",
            hidden: "Hidden",
            moderateHide: "Hide",
            moderateUnhide: "Unhide",
            moderatePin: "Pin",
            moderateUnpin: "Unpin",
            openTrack: "Related track",
            needProfile: "Create your profile first to post.",
            loadingFeed: "Loading…",
            topics: "Categories",
            writePost: "Create post",
            postSuccess: "Post published.",
            shareCopied: "Link copied.",
            latest: "New",
          },
    [isKorean],
  );

  const categoryOptions = useMemo(
    () =>
      COMMUNITY_CATEGORIES.map((item) => ({
        ...item,
        label: isKorean ? item.titleKo : item.title,
      })),
    [isKorean],
  );

  const { data: myProfile } = useQuery<MeProfile>({
    queryKey: ["/api/profiles/me"],
    enabled: isAuthenticated,
    retry: false,
  });

  const prefetchTrackPicks = isAuthenticated && Boolean(myProfile);

  const { data: audioPickOptions, isFetching: audioPickLoading } = useQuery<PickTrack[]>({
    queryKey: ["/api/community/pick/audio"],
    queryFn: () => fetchCommunityAudioPickOptions(""),
    enabled: prefetchTrackPicks,
    retry: false,
    staleTime: 15_000,
  });

  const { data: mvPickOptions, isFetching: mvPickLoading } = useQuery<PickTrack[]>({
    queryKey: ["/api/community/pick/mv"],
    queryFn: () => fetchCommunityMvPickOptions(""),
    enabled: prefetchTrackPicks,
    retry: false,
    staleTime: 15_000,
  });

  const postsUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("category", selectedCategory);
    params.set("sort", "latest");
    params.set("limit", "80");
    return `/api/community/posts?${params.toString()}`;
  }, [selectedCategory]);

  const { data: posts, isLoading } = useQuery<CommunityPost[]>({
    queryKey: [postsUrl],
    retry: false,
    staleTime: 30_000,
  });

  const fallbackPosts = useMemo<CommunityPost[]>(
    () =>
      COMMUNITY_SYSTEM_SEED_POSTS.filter((seed) => seed.category === selectedCategory).map((seed, index) => ({
        id: seed.postId ?? -(index + 1),
        category: seed.category,
        title: formatCommunitySeedTitle(seed, isKorean),
        body: formatCommunitySeedBody(seed, isKorean),
        externalUrl: null,
        createdAt: new Date("2026-07-04T20:49:16+09:00").toISOString(),
        pinnedAt: seed.pinned ? new Date("2026-07-04T20:49:16+09:00").toISOString() : null,
        hiddenAt: null,
        hiddenReason: null,
        authorUserId: COMMUNITY_SYSTEM_AUTHOR_ID,
        authorName: "nexcommunity",
        authorProfileId: 160,
        authorIsVerified: true,
        attachedTrack: null,
        likeCount: 0,
        commentCount: 0,
        viewerHasLiked: false,
      })),
    [isKorean, selectedCategory],
  );

  const postsCount = posts?.length ?? 0;
  const renderedPosts: CommunityPost[] = postsCount > 0 ? posts ?? [] : fallbackPosts;
  const showLoadingState = isLoading && postsCount === 0;

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/community/posts", {
        category,
        title,
        body,
        attachedTrackId: Number(attachedTrackId),
      });
      return res.json() as Promise<{ postId: number; message: string }>;
    },
    onSuccess: async (data) => {
      setTitle("");
      setBody("");
      setAttachedAudioTrackId("");
      setAttachedMvTrackId("");
      setWriteOpen(false);
      setSelectedCategory(category);
      await invalidateCommunityQueries();
      toast({ title: data.message || copy.postSuccess });
    },
    onError: (err: any) => toast({ title: String(err?.message ?? "Failed to create post"), variant: "destructive" }),
  });

  const likeMutation = useMutation({
    mutationFn: async (postId: number) => {
      const res = await apiRequest("POST", `/api/community/posts/${postId}/like`);
      return res.json() as Promise<{ liked: boolean }>;
    },
    onMutate: async (postId) => {
      const snapshot = await optimisticToggleLike(queryClient, postId);
      return snapshot;
    },
    onError: (err: any, _postId, snapshot) => {
      if (snapshot) rollbackLike(queryClient, snapshot);
      toast({ title: String(err?.message ?? "Failed to update like"), variant: "destructive" });
    },
    onSettled: () => {
      void invalidateCommunityQueries();
    },
  });

  const moderateMutation = useMutation({
    mutationFn: async ({ postId, action }: { postId: number; action: "hide" | "unhide" | "pin" | "unpin" }) => {
      await apiRequest("PATCH", `/api/community/posts/${postId}/moderate`, { action });
    },
    onSuccess: async () => {
      await invalidateCommunityQueries();
    },
    onError: (err: any) => toast({ title: String(err?.message ?? "Failed to moderate"), variant: "destructive" }),
  });

  const admin = user?.role === "admin";
  const activeCategory = categoryOptions.find((item) => item.slug === selectedCategory);

  const openWriteDialog = () => {
    setCategory(selectedCategory);
    setTitle("");
    setBody("");
    setAttachedAudioTrackId("");
    setAttachedMvTrackId("");
    setWriteOpen(true);
  };

  const openPost = (postId: number) => {
    if (postId <= 0) return;
    setLocation(`/community/${postId}`);
  };

  const closePost = () => {
    setLocation("/community");
  };

  const sharePost = async (postId: number, postTitle: string) => {
    const url = `${window.location.origin}/community/${postId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: postTitle, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast({ title: copy.shareCopied });
    } catch {
      /* user cancelled share */
    }
  };

  const writeForm = (
    <>
      {!isAuthenticated ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-zinc-200">{copy.loginNeeded}</div>
      ) : !myProfile ? (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">{copy.needProfile}</div>
      ) : (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-400">{copy.category}</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CommunityCategorySlug)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-primary/50"
            >
              {categoryOptions.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <select
            value={attachedAudioTrackId}
            onChange={(e) => {
              const next = e.target.value;
              setAttachedAudioTrackId(next);
              if (next) setAttachedMvTrackId("");
            }}
            disabled={audioPickLoading && !audioPickOptions}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-primary/50 disabled:opacity-60"
          >
            <option value="" disabled>
              {audioPickLoading && !audioPickOptions ? copy.relatedTrackLoading : copy.relatedAudioTrack}
            </option>
            {(audioPickOptions ?? []).map((track) => (
              <option key={track.id} value={track.id}>
                {formatCommunityTrackPickLabel(track)}
              </option>
            ))}
          </select>

          <select
            value={attachedMvTrackId}
            onChange={(e) => {
              const next = e.target.value;
              setAttachedMvTrackId(next);
              if (next) setAttachedAudioTrackId("");
            }}
            disabled={mvPickLoading && !mvPickOptions}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-primary/50 disabled:opacity-60"
          >
            <option value="" disabled>
              {mvPickLoading && !mvPickOptions ? copy.relatedTrackLoading : copy.relatedMv}
            </option>
            {(mvPickOptions ?? []).map((track) => (
              <option key={track.id} value={track.id}>
                {formatCommunityTrackPickLabel(track)}
              </option>
            ))}
          </select>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            placeholder={copy.title}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-primary/50"
          />

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            maxLength={5000}
            placeholder={copy.bodyPlaceholder}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-primary/50"
          />

          <button
            type="button"
            disabled={createMutation.isPending || !title.trim() || !attachedTrackId}
            onClick={() => {
              if (!attachedTrackId) {
                toast({ title: copy.pickRequired, variant: "destructive" });
                return;
              }
              createMutation.mutate();
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary px-5 py-3 text-sm font-bold text-black transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {copy.publish}
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="mx-auto max-w-6xl pb-16 pt-2">
      <div className="grid items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Left sidebar — categories + write */}
        <aside className="lg:sticky lg:top-24">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-2">
            <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">{copy.topics}</p>
            <nav className="space-y-0.5">
              {categoryOptions.map((item) => {
                const active = selectedCategory === item.slug;
                const Icon = CATEGORY_ICONS[item.slug];
                return (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(item.slug);
                      setCategory(item.slug);
                      closePost();
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      active
                        ? "bg-white/10 font-bold text-white"
                        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-zinc-500"}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={openWriteDialog}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-black transition hover:bg-primary/90"
            >
              <PenLine className="h-4 w-4" />
              {copy.writePost}
            </button>
          </div>
        </aside>

        {/* Right feed */}
        <main className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <h1 className="text-lg font-black text-white md:text-xl">{activeCategory?.label}</h1>
            <span className="text-xs font-semibold text-zinc-500">{copy.latest}</span>
          </div>

          {showLoadingState && (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/50 px-5 py-8 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              {copy.loadingFeed}
            </div>
          )}

          {!showLoadingState && posts && posts.length === 0 && fallbackPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center text-sm text-zinc-500">{copy.emptyFeed}</div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60">
              {renderedPosts.map((post) => {
                const categoryItem = categoryOptions.find((item) => item.slug === post.category);
                const seed = getCommunitySystemSeed(post.category, post.authorUserId);
                const displayTitle = seed ? formatCommunitySeedTitle(seed, isKorean) : post.title;
                const displayBody = seed ? formatCommunitySeedBody(seed, isKorean) : post.body;
                const trackHref = post.attachedTrack
                  ? post.attachedTrack.trackType === "video"
                    ? `/mv/${post.attachedTrack.id}`
                    : `/track/${post.attachedTrack.id}`
                  : null;

                return (
                  <article
                    key={post.id}
                    className="flex gap-2 border-b border-white/10 px-3 py-3 transition last:border-b-0 hover:bg-white/[0.02] md:gap-3 md:px-4 md:py-4"
                  >
                    {/* Vote column */}
                    <div className="flex shrink-0 flex-col items-center gap-0.5 pt-1">
                      <button
                        type="button"
                        disabled={!isAuthenticated || post.id <= 0}
                        onClick={() => likeMutation.mutate(post.id)}
                        className={`rounded-md p-0.5 transition hover:bg-primary/10 ${
                          post.viewerHasLiked ? "text-primary" : "text-zinc-500 hover:text-primary"
                        } disabled:cursor-not-allowed disabled:opacity-40`}
                        aria-label="Upvote"
                      >
                        <ChevronUp className={`h-5 w-5 md:h-6 md:w-6 ${post.viewerHasLiked ? "fill-current" : ""}`} strokeWidth={2.5} />
                      </button>
                      <span className={`text-[11px] font-bold tabular-nums md:text-xs ${post.viewerHasLiked ? "text-primary" : "text-zinc-400"}`}>
                        {post.likeCount}
                      </span>
                      <button
                        type="button"
                        disabled={!isAuthenticated || !post.viewerHasLiked || post.id <= 0}
                        onClick={() => post.viewerHasLiked && likeMutation.mutate(post.id)}
                        className="rounded-md p-0.5 text-zinc-600 transition hover:bg-white/5 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Downvote"
                      >
                        <ChevronDown className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2.5} />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500 md:text-xs">
                        <span className="font-semibold text-zinc-300">{categoryItem?.label}</span>
                        <span>·</span>
                        <span>@{post.authorName ?? "unknown"}</span>
                        <span>·</span>
                        <span>{formatRelativeTime(post.createdAt, locale)}</span>
                        {post.pinnedAt && (
                          <span className="inline-flex items-center gap-0.5 text-yellow-300">
                            <Pin className="h-3 w-3" />
                            {copy.pinned}
                          </span>
                        )}
                        {post.isTrackCreatorPost && (
                          <span className="text-cyan-300">{copy.creatorNote}</span>
                        )}
                      </div>

                      {post.id > 0 ? (
                        <button
                          type="button"
                          onClick={() => openPost(post.id)}
                          className="mt-1 block w-full text-left text-base font-bold leading-snug text-zinc-100 hover:text-primary md:text-lg"
                        >
                          {displayTitle}
                        </button>
                      ) : (
                        <h3 className="mt-1 text-base font-bold leading-snug text-zinc-100 md:text-lg">{displayTitle}</h3>
                      )}

                      {post.attachedTrack && trackHref && (
                        <Link
                          href={trackHref}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          <Music2 className="h-3.5 w-3.5" />
                          {copy.openTrack}: {post.attachedTrack.title}
                        </Link>
                      )}

                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-400">{excerpt(displayBody)}</p>

                      {/* Action bar */}
                      <div className="mt-3 flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          disabled={!isAuthenticated || post.id <= 0}
                          onClick={() => likeMutation.mutate(post.id)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                            post.viewerHasLiked
                              ? "bg-primary/10 text-primary"
                              : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <Heart className={`h-3.5 w-3.5 ${post.viewerHasLiked ? "fill-current" : ""}`} />
                          {copy.like}
                        </button>

                        {post.id > 0 ? (
                          <button
                            type="button"
                            onClick={() => openPost(post.id)}
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            {post.commentCount} {copy.comments}
                          </button>
                        ) : null}

                        {post.id > 0 ? (
                          <button
                            type="button"
                            onClick={() => void sharePost(post.id, displayTitle)}
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                            {copy.share}
                          </button>
                        ) : null}

                        {admin && post.id > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => moderateMutation.mutate({ postId: post.id, action: post.hiddenAt ? "unhide" : "hide" })}
                              className="rounded-full px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/10"
                            >
                              {post.hiddenAt ? copy.moderateUnhide : copy.moderateHide}
                            </button>
                            <button
                              type="button"
                              onClick={() => moderateMutation.mutate({ postId: post.id, action: post.pinnedAt ? "unpin" : "pin" })}
                              className="rounded-full px-2 py-1 text-[10px] text-yellow-200 hover:bg-yellow-500/10"
                            >
                              {post.pinnedAt ? copy.moderateUnpin : copy.moderatePin}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Write modal */}
      <Dialog open={writeOpen} onOpenChange={setWriteOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-zinc-950 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{copy.createTitle}</DialogTitle>
          </DialogHeader>
          {writeForm}
        </DialogContent>
      </Dialog>

      {/* Post detail popup — Reddit style */}
      <Dialog open={detailOpen} onOpenChange={(open) => !open && closePost()}>
        <DialogContent className="max-h-[92vh] w-[95vw] max-w-3xl overflow-y-auto border-white/10 bg-zinc-950 p-0 text-white sm:rounded-2xl">
          {detailPostId ? <CommunityPostPanel postId={detailPostId} layout="modal" onClose={closePost} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
