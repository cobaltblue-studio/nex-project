import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MessageSquare, Heart, Pin, Loader2, Sparkles, Swords, Lightbulb, ExternalLink, PenLine, Search, BookOpen, Music2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

type CommunityPost = {
  id: number;
  category: CommunityCategorySlug;
  title: string;
  body: string;
  externalUrl: string | null;
  createdAt: string;
  pinnedAt: string | null;
  hiddenAt: string | null;
  hiddenReason: string | null;
  authorUserId: string;
  authorName: string | null;
  authorProfileId: number | null;
  authorIsVerified: boolean;
  attachedTrack: {
    id: number;
    title: string;
    trackType: string;
    creatorName: string | null;
  } | null;
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
  isTrackCreatorPost?: boolean;
};

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

function formatTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale.startsWith("ko") ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function excerpt(text: string, max = 220) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

function isExcerpted(text: string, max = 220) {
  return text.length > max;
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
  const [selectedCategory, setSelectedCategory] = useState<CommunityCategorySlug>("track-share");
  const [sortBy, setSortBy] = useState<"latest" | "popular">("latest");
  const [search, setSearch] = useState("");
  const [writeOpen, setWriteOpen] = useState(false);
  const [category, setCategory] = useState<CommunityCategorySlug>("track-share");
  const [title, setTitle] = useState("");
  const [attachedAudioTrackId, setAttachedAudioTrackId] = useState("");
  const [attachedMvTrackId, setAttachedMvTrackId] = useState("");
  const [trackSearch, setTrackSearch] = useState("");
  const [debouncedTrackSearch, setDebouncedTrackSearch] = useState("");

  const attachedTrackId = attachedAudioTrackId || attachedMvTrackId;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedTrackSearch(trackSearch.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [trackSearch]);

  const copy = useMemo(
    () =>
      isKorean
        ? {
            pageEyebrow: "NEX 커뮤니티",
            pageTitle: "커뮤니티",
            pageBody: "트랙 등록은 '트랙 제출'에서 하세요. 여기서는 제작 의도, 과정, 고민을 나누고 댓글로 의견을 주고받는 공간입니다.",
            createTitle: "새 글 쓰기",
            bodyPlaceholder: "예: 이 곡은 ○○ 분위기를 목표로 만들었고, 프롬프트에서 ○○를 바꿨더니 훅이 달라졌습니다...",
            loginNeeded: "글 작성과 좋아요, 댓글은 로그인 후 사용할 수 있습니다.",
            category: "카테고리",
            sortLatest: "최신순",
            sortPopular: "인기순",
            search: "제목/본문 검색",
            title: "제목",
            body: "본문",
            relatedAudioTrack: "관련 곡 — NEW & TOP 100",
            relatedMv: "관련 Music Video",
            pickPlaceholder: "선택…",
            relatedTrackSearch: "제목",
            relatedTrackLoading: "목록 불러오는 중…",
            pickRequired: "관련 곡 또는 뮤직비디오를 선택해 주세요.",
            creatorNote: "크리에이터 노트",
            publish: "글 올리기",
            feedTitle: "커뮤니티 피드",
            emptyFeed: "아직 글이 없습니다. 첫 번째 대화를 시작해 보세요.",
            like: "좋아요",
            comments: "댓글",
            open: "열기",
            pinned: "고정",
            hidden: "숨김",
            moderateHide: "숨기기",
            moderateUnhide: "숨김 해제",
            moderatePin: "상단 고정",
            moderateUnpin: "고정 해제",
            openTrack: "관련 곡",
            viewExternal: "외부 링크 열기",
            needProfile: "커뮤니티 글을 쓰려면 먼저 프로필이 있어야 합니다.",
            loadingFeed: "커뮤니티 피드를 불러오는 중...",
            feedSyncing: "최신 글을 가져오는 중입니다.",
            topics: "주제",
            writePost: "글쓰기",
            readMore: "더보기",
            postSuccess: "글이 등록되었습니다.",
          }
        : {
            pageEyebrow: "NEX COMMUNITY",
            pageTitle: "COMMUNITY",
            pageBody: "Use Submit Track to register music. This space is for creative intent, process notes, and discussion through comments.",
            createTitle: "Start a post",
            bodyPlaceholder: "Example: I aimed for a ○○ mood. Changing ○○ in the prompt shifted the hook...",
            loginNeeded: "Login is required to post, like, and comment.",
            category: "Category",
            sortLatest: "Latest",
            sortPopular: "Popular",
            search: "Search title or body",
            title: "Title",
            body: "Body",
            relatedAudioTrack: "Related track — NEW & TOP 100",
            relatedMv: "Related music video",
            pickPlaceholder: "Select…",
            relatedTrackSearch: "Title",
            relatedTrackLoading: "Loading…",
            pickRequired: "Please select a related track or music video.",
            creatorNote: "Creator note",
            publish: "Publish post",
            feedTitle: "Community feed",
            emptyFeed: "No posts yet. Start the first conversation.",
            like: "Likes",
            comments: "Comments",
            open: "Open",
            pinned: "Pinned",
            hidden: "Hidden",
            moderateHide: "Hide",
            moderateUnhide: "Unhide",
            moderatePin: "Pin",
            moderateUnpin: "Unpin",
            openTrack: "Related track",
            viewExternal: "Open external link",
            needProfile: "Create your profile first to post in the community.",
            loadingFeed: "Loading community feed...",
            feedSyncing: "Refreshing latest posts...",
            topics: "Topics",
            writePost: "Write",
            readMore: "Read more",
            postSuccess: "Post published.",
          },
    [isKorean],
  );

  const categoryOptions = useMemo(
    () =>
      COMMUNITY_CATEGORIES.map((item) => ({
        ...item,
        label: isKorean ? item.titleKo : item.title,
        description: isKorean ? item.descriptionKo : item.description,
      })),
    [isKorean],
  );

  const { data: myProfile } = useQuery<MeProfile>({
    queryKey: ["/api/profiles/me"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: audioPickOptions, isFetching: audioPickLoading } = useQuery<PickTrack[]>({
    queryKey: ["/api/community/pick/audio", debouncedTrackSearch],
    queryFn: () => fetchCommunityAudioPickOptions(debouncedTrackSearch),
    enabled: writeOpen,
    retry: false,
    staleTime: 15_000,
  });

  const { data: mvPickOptions, isFetching: mvPickLoading } = useQuery<PickTrack[]>({
    queryKey: ["/api/community/pick/mv", debouncedTrackSearch],
    queryFn: () => fetchCommunityMvPickOptions(debouncedTrackSearch),
    enabled: writeOpen,
    retry: false,
    staleTime: 15_000,
  });

  const postsUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("category", selectedCategory);
    params.set("sort", sortBy);
    if (search.trim()) params.set("q", search.trim());
    params.set("limit", "60");
    return `/api/community/posts?${params.toString()}`;
  }, [search, selectedCategory, sortBy]);

  const { data: posts, isLoading } = useQuery<CommunityPost[]>({
    queryKey: [postsUrl],
    retry: false,
    staleTime: 30_000,
  });

  const fallbackPosts = useMemo<CommunityPost[]>(
    () =>
      COMMUNITY_SYSTEM_SEED_POSTS.map((seed, index) => ({
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
    [isKorean],
  );

  const postsCount = posts?.length ?? 0;
  const renderedPosts: CommunityPost[] = postsCount > 0 ? posts ?? [] : fallbackPosts;
  const showLoadingState = isLoading && postsCount === 0;

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/community/posts", {
        category,
        title,
        body: "",
        attachedTrackId: Number(attachedTrackId),
      });
      return res.json() as Promise<{ postId: number; message: string }>;
    },
    onSuccess: async (data) => {
      setTitle("");
      setAttachedAudioTrackId("");
      setAttachedMvTrackId("");
      setWriteOpen(false);
      setSelectedCategory(category);
      setSortBy("latest");
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
    onSuccess: async () => {
      await invalidateCommunityQueries();
    },
    onError: (err: any) => toast({ title: String(err?.message ?? "Failed to update like"), variant: "destructive" }),
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
  const feedDescription = activeCategory?.description;

  const openWriteDialog = () => {
    setCategory(selectedCategory);
    setTrackSearch("");
    setDebouncedTrackSearch("");
    setAttachedAudioTrackId("");
    setAttachedMvTrackId("");
    setWriteOpen(true);
  };

  const writeForm = (
    <>
      {!isAuthenticated ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-zinc-200">{copy.loginNeeded}</div>
      ) : !myProfile ? (
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">{copy.needProfile}</div>
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

          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-400">{copy.title}</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={140}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-primary/50"
            />
          </label>

          <div className="space-y-3">
            <input
              value={trackSearch}
              onChange={(e) => setTrackSearch(e.target.value)}
              placeholder={copy.relatedTrackSearch}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-primary/50"
            />

            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-400">{copy.relatedAudioTrack}</span>
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
                  {audioPickLoading && !audioPickOptions ? copy.relatedTrackLoading : copy.pickPlaceholder}
                </option>
                {(audioPickOptions ?? []).map((track) => (
                  <option key={track.id} value={track.id}>
                    {formatCommunityTrackPickLabel(track)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-400">{copy.relatedMv}</span>
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
                  {mvPickLoading && !mvPickOptions ? copy.relatedTrackLoading : copy.pickPlaceholder}
                </option>
                {(mvPickOptions ?? []).map((track) => (
                  <option key={track.id} value={track.id}>
                    {formatCommunityTrackPickLabel(track)}
                  </option>
                ))}
              </select>
            </label>
          </div>

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
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-5 py-3 text-sm font-bold text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {copy.publish}
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="mx-auto max-w-5xl pb-12">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h1 className="text-[11px] font-bold uppercase tracking-[0.4em] text-primary">{copy.pageEyebrow}</h1>
        </div>
        <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-white neon-text-strong neon-text-green md:text-4xl">
          {copy.pageTitle}
        </h2>
        <p className="mt-2 text-sm text-zinc-500">{copy.pageBody}</p>
      </div>

      <section className="grid items-start gap-5 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-white/10 bg-black/30 p-3 lg:sticky lg:top-28">
          <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">{copy.topics}</p>
          <nav className="space-y-1">
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
                  }}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    active
                      ? "border border-primary/40 bg-primary/10 font-bold text-primary"
                      : "border border-transparent text-zinc-300 hover:border-white/10 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-zinc-500"}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.03] p-5 md:p-7">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-black text-white md:text-2xl">{activeCategory?.label}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{feedDescription}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "latest" | "popular")}
                className="rounded-sm border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-primary/40"
              >
                <option value="latest">{copy.sortLatest}</option>
                <option value="popular">{copy.sortPopular}</option>
              </select>

              <div className="relative min-w-[12rem]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={copy.search}
                  className="w-full rounded-sm border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-primary/40"
                />
              </div>

              <button
                type="button"
                onClick={openWriteDialog}
                className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/20"
              >
                <PenLine className="h-4 w-4" />
                {copy.writePost}
              </button>
            </div>
          </div>

          {showLoadingState && (
            <div className="mt-6 flex items-center gap-3 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              {copy.loadingFeed}
            </div>
          )}

          {!showLoadingState && posts && posts.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-500">{copy.emptyFeed}</div>
          ) : (
            <div className="mt-6 space-y-4">
              {renderedPosts.map((post) => {
                const categoryItem = categoryOptions.find((item) => item.slug === post.category);
                const Icon = CATEGORY_ICONS[post.category];
                const seed = getCommunitySystemSeed(post.category, post.authorUserId);
                const displayTitle = seed ? formatCommunitySeedTitle(seed, isKorean) : post.title;
                const displayBody = seed ? formatCommunitySeedBody(seed, isKorean) : post.body;
                const truncated = isExcerpted(displayBody);
                const openLabel = truncated ? copy.readMore : copy.open;
                const trackHref = post.attachedTrack
                  ? post.attachedTrack.trackType === "video"
                    ? `/mv/${post.attachedTrack.id}`
                    : `/track/${post.attachedTrack.id}`
                  : null;
                return (
                  <article key={post.id} className="rounded-2xl border border-white/10 bg-black/30 p-5">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-primary">
                        <Icon className="h-3 w-3" />
                        {categoryItem?.label}
                      </span>
                      {post.isTrackCreatorPost && post.attachedTrack ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-cyan-100">
                          <Pin className="h-3 w-3" />
                          {copy.creatorNote}
                        </span>
                      ) : post.pinnedAt ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-yellow-200">
                          <Pin className="h-3 w-3" />
                          {copy.pinned}
                        </span>
                      ) : null}
                        {post.hiddenAt && (
                        <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-red-200">{copy.hidden}</span>
                      )}
                    </div>

                    {post.attachedTrack && trackHref && (
                      <Link
                        href={trackHref}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
                      >
                        <Music2 className="h-3.5 w-3.5" />
                        {copy.openTrack}: {post.attachedTrack.title}
                      </Link>
                    )}

                    {post.id > 0 ? (
                      <h3 className="mt-3 text-lg font-black text-white md:text-xl">
                        <Link href={`/community/${post.id}`} className="hover:text-primary">
                          {displayTitle}
                        </Link>
                      </h3>
                    ) : (
                      <h3 className="mt-3 text-lg font-black text-white md:text-xl">{displayTitle}</h3>
                    )}

                    <p className="mt-2 text-sm leading-7 text-zinc-300 whitespace-pre-wrap">{excerpt(displayBody)}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      <span>@{post.authorName ?? "unknown"}</span>
                      <span>{formatTime(post.createdAt, locale)}</span>
                    </div>

                    {(post.externalUrl) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {post.externalUrl && (
                          <a
                            href={post.externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-primary/40 hover:text-primary"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {copy.viewExternal}
                          </a>
                        )}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={!isAuthenticated || likeMutation.isPending || post.id <= 0}
                          onClick={() => likeMutation.mutate(post.id)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
                            post.viewerHasLiked
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-white/10 bg-white/5 text-zinc-300 hover:border-primary/40 hover:text-primary"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          <Heart className={`h-3.5 w-3.5 ${post.viewerHasLiked ? "fill-current" : ""}`} />
                          {copy.like} {post.likeCount}
                        </button>
                        {post.id > 0 ? (
                          <Link
                            href={`/community/${post.id}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-primary/40 hover:text-primary"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            {copy.comments} {post.commentCount}
                          </Link>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {post.id > 0 && truncated ? (
                          <Link
                            href={`/community/${post.id}`}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            {openLabel}
                          </Link>
                        ) : null}
                        {admin && (
                          <>
                            <button
                              type="button"
                              onClick={() => moderateMutation.mutate({ postId: post.id, action: post.hiddenAt ? "unhide" : "hide" })}
                              className="rounded-full border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs text-red-200 transition hover:bg-red-500/10"
                            >
                              {post.hiddenAt ? copy.moderateUnhide : copy.moderateHide}
                            </button>
                            <button
                              type="button"
                              onClick={() => moderateMutation.mutate({ postId: post.id, action: post.pinnedAt ? "unpin" : "pin" })}
                              className="rounded-full border border-yellow-500/20 bg-yellow-500/5 px-3 py-1.5 text-xs text-yellow-100 transition hover:bg-yellow-500/10"
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

          {showLoadingState ? <p className="mt-4 text-xs text-zinc-500">{copy.feedSyncing}</p> : null}
        </div>
      </section>

      <Dialog open={writeOpen} onOpenChange={setWriteOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-zinc-950 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{copy.createTitle}</DialogTitle>
          </DialogHeader>
          {writeForm}
        </DialogContent>
      </Dialog>
    </div>
  );
}

