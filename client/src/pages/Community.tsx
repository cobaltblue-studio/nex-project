import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MessageSquare, Heart, Pin, Loader2, Megaphone, Sparkles, Swords, Lightbulb, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { COMMUNITY_CATEGORIES, type CommunityCategorySlug } from "@shared/community";

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
};

type MeProfile = { id: number; username: string; role?: string } | null;
type MyTrack = { id: number; title: string; trackType: string; status: string };

const CATEGORY_ICONS: Record<CommunityCategorySlug, typeof MessageSquare> = {
  "track-share": Megaphone,
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
  const [selectedCategory, setSelectedCategory] = useState<CommunityCategorySlug | "all">("all");
  const [sortBy, setSortBy] = useState<"latest" | "popular">("latest");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CommunityCategorySlug>("track-share");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [attachedTrackId, setAttachedTrackId] = useState("");

  const copy = useMemo(
    () =>
      isKorean
        ? {
            pageTitle: "NEX Community",
            pageBody: "AI 음악 제작자들이 트랙, 프롬프트, 배틀 전략, 서비스 아이디어를 나누는 공간입니다.",
            createTitle: "새 글 쓰기",
            createHint: "트랙 홍보만이 아니라 제작 과정, 막힌 점, 배틀 해설까지 자유롭게 올릴 수 있습니다.",
            loginNeeded: "글 작성과 좋아요, 댓글은 로그인 후 사용할 수 있습니다.",
            category: "카테고리",
            sortLatest: "최신순",
            sortPopular: "인기순",
            search: "제목/본문 검색",
            title: "제목",
            body: "본문",
            trackAttach: "내 트랙 첨부",
            noTrackAttach: "트랙 첨부 안 함",
            externalUrl: "외부 링크",
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
            openTrack: "첨부 트랙 보기",
            viewExternal: "외부 링크 열기",
            needProfile: "커뮤니티 글을 쓰려면 먼저 프로필이 있어야 합니다.",
          }
        : {
            pageTitle: "NEX Community",
            pageBody: "A place for AI music creators to share tracks, prompts, battle strategy, and product ideas.",
            createTitle: "Start a post",
            createHint: "Use this space for launches, workflow notes, battle reactions, or requests for help.",
            loginNeeded: "Login is required to post, like, and comment.",
            category: "Category",
            sortLatest: "Latest",
            sortPopular: "Popular",
            search: "Search title or body",
            title: "Title",
            body: "Body",
            trackAttach: "Attach my track",
            noTrackAttach: "No track attached",
            externalUrl: "External link",
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
            openTrack: "Open attached track",
            viewExternal: "Open external link",
            needProfile: "Create your profile first to post in the community.",
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

  const tracksUrl = myProfile?.id ? `/api/tracks?creatorId=${myProfile.id}` : "";
  const { data: myTracks } = useQuery<MyTrack[]>({
    queryKey: [tracksUrl],
    enabled: Boolean(tracksUrl),
    retry: false,
  });

  const postsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    params.set("sort", sortBy);
    if (search.trim()) params.set("q", search.trim());
    params.set("limit", "60");
    return `/api/community/posts?${params.toString()}`;
  }, [search, selectedCategory, sortBy]);

  const { data: posts, isLoading } = useQuery<CommunityPost[]>({
    queryKey: [postsUrl],
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/community/posts", {
        category,
        title,
        body,
        externalUrl: externalUrl.trim() || null,
        attachedTrackId: attachedTrackId ? Number(attachedTrackId) : null,
      });
      return res.json() as Promise<{ postId: number; message: string }>;
    },
    onSuccess: async (data) => {
      setTitle("");
      setBody("");
      setExternalUrl("");
      setAttachedTrackId("");
      await invalidateCommunityQueries();
      toast({ title: data.message });
      setLocation(`/community/${data.postId}`);
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
  const feedDescription =
    selectedCategory === "all"
      ? isKorean
        ? "모든 카테고리 글을 보고 있습니다."
        : "Browsing all categories."
      : categoryOptions.find((item) => item.slug === selectedCategory)?.description;

  return (
    <div className="space-y-10 pb-12">
      <section className="grid items-start gap-5 lg:grid-cols-[1.25fr_0.95fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-primary">COMMUNITY</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">{copy.pageTitle}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">{copy.pageBody}</p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {categoryOptions.map((item) => {
              const Icon = CATEGORY_ICONS[item.slug];
              const active = selectedCategory === item.slug;
              return (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(item.slug);
                    setCategory(item.slug);
                  }}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active ? "border-primary/50 bg-primary/10" : "border-white/10 bg-black/20 hover:border-white/25"
                  }`}
                >
                  <div className="flex items-center gap-2 text-white">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold">{item.label}</span>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-zinc-400">{item.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">{copy.feedTitle}</h2>
                <p className="mt-2 text-sm text-zinc-400">{feedDescription}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-[10rem_10rem_16rem]">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as CommunityCategorySlug | "all")}
                  className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
                >
                  <option value="all">{isKorean ? "전체 카테고리" : "All categories"}</option>
                  {categoryOptions.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "latest" | "popular")}
                  className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
                >
                  <option value="latest">{copy.sortLatest}</option>
                  <option value="popular">{copy.sortPopular}</option>
                </select>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={copy.search}
                  className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="mt-8 flex items-center gap-3 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading community feed...
              </div>
            ) : !posts?.length ? (
              <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-500">{copy.emptyFeed}</div>
            ) : (
              <div className="mt-8 space-y-4">
                {posts.map((post) => {
                  const categoryItem = categoryOptions.find((item) => item.slug === post.category);
                  const Icon = CATEGORY_ICONS[post.category];
                  const trackHref = post.attachedTrack
                    ? post.attachedTrack.trackType === "video"
                      ? `/mv/${post.attachedTrack.id}`
                      : `/track/${post.attachedTrack.id}`
                    : null;
                  return (
                    <article key={post.id} className="rounded-2xl border border-white/10 bg-black/30 p-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-primary">
                              <Icon className="h-3 w-3" />
                              {categoryItem?.label}
                            </span>
                            {post.pinnedAt && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-yellow-200">
                                <Pin className="h-3 w-3" />
                                {copy.pinned}
                              </span>
                            )}
                            {post.hiddenAt && (
                              <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-red-200">{copy.hidden}</span>
                            )}
                          </div>

                          <h3 className="mt-3 text-xl font-black text-white">
                            <Link href={`/community/${post.id}`} className="hover:text-primary">
                              {post.title}
                            </Link>
                          </h3>
                          <p className="mt-2 text-sm leading-7 text-zinc-300 whitespace-pre-wrap">{excerpt(post.body)}</p>

                          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                            <span>@{post.authorName ?? "unknown"}</span>
                            <span>{formatTime(post.createdAt, locale)}</span>
                            <span>
                              {copy.like} {post.likeCount}
                            </span>
                            <span>
                              {copy.comments} {post.commentCount}
                            </span>
                          </div>

                          {(post.attachedTrack || post.externalUrl) && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {post.attachedTrack && trackHref && (
                                <Link
                                  href={trackHref}
                                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-primary/40 hover:text-primary"
                                >
                                  {copy.openTrack}: {post.attachedTrack.title}
                                </Link>
                              )}
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
                        </div>

                        <div className="flex flex-wrap gap-2 md:justify-end">
                          <button
                            type="button"
                            disabled={!isAuthenticated || likeMutation.isPending}
                            onClick={() => likeMutation.mutate(post.id)}
                            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition ${
                              post.viewerHasLiked
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "border-white/10 bg-white/5 text-zinc-300 hover:border-primary/40 hover:text-primary"
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            <Heart className={`h-3 w-3 ${post.viewerHasLiked ? "fill-current" : ""}`} />
                            {copy.like}
                          </button>
                          <Link
                            href={`/community/${post.id}`}
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-primary/40 hover:text-primary"
                          >
                            <MessageSquare className="h-3 w-3" />
                            {copy.open}
                          </Link>
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
          </div>
        </div>

        <section className="self-start rounded-3xl border border-white/10 bg-black/30 p-6 md:p-8 lg:sticky lg:top-28">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-black text-white">{copy.createTitle}</h2>
          </div>
          <p className="mt-2 text-xs leading-6 text-zinc-400">{copy.createHint}</p>

          {!isAuthenticated ? (
            <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-zinc-200">
              {copy.loginNeeded}
            </div>
          ) : !myProfile ? (
            <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
              {copy.needProfile}
            </div>
          ) : (
            <div className="mt-5 space-y-3">
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

              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-400">{copy.body}</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                  maxLength={5000}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-primary/50"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-400">{copy.trackAttach}</span>
                <select
                  value={attachedTrackId}
                  onChange={(e) => setAttachedTrackId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-primary/50"
                >
                  <option value="">{copy.noTrackAttach}</option>
                  {(myTracks ?? []).map((track) => (
                    <option key={track.id} value={track.id}>
                      {track.title} · {track.trackType}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-400">{copy.externalUrl}</span>
                <input
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-primary/50"
                />
              </label>

              <button
                type="button"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-5 py-3 text-sm font-bold text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {copy.publish}
              </button>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

