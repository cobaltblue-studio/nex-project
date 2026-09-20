import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  Home,
  Lightbulb,
  Loader2,
  MessageCircle,
  PenLine,
  Sparkles,
  Swords,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { optimisticToggleLike, rollbackLike } from "@/lib/communityOptimistic";
import { CommunityPostPanel, type CommunityPost } from "@/components/CommunityPostPanel";
import { CommunityFeedCard } from "@/components/CommunityFeedCard";
import { CommunityComposer } from "@/components/CommunityComposer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_REDDIT_BG,
  COMMUNITY_REDDIT_BORDER,
  COMMUNITY_REDDIT_CARD,
  COMMUNITY_REDDIT_HOVER,
  COMMUNITY_REDDIT_INK,
  COMMUNITY_REDDIT_MUTED,
  resolveCommunityPostDisplay,
  type CommunityCategorySlug,
} from "@shared/community";

type MeProfile = { id: number; username: string; role?: string } | null;
type SortMode = "latest" | "popular";

const HANGUL_RE = /[\uAC00-\uD7A3]/;

const CATEGORY_ICONS: Record<CommunityCategorySlug, typeof Home> = {
  "track-share": Sparkles,
  prompts: MessageCircle,
  "battle-talk": Swords,
  "help-ideas": Lightbulb,
};

export default function Community() {
  const { i18n } = useTranslation();
  const isKorean = Boolean(i18n.language?.startsWith("ko"));
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [matchDetail, params] = useRoute("/community/:id");
  const detailId = matchDetail ? Number(params?.id) : NaN;
  const [composeOpen, setComposeOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | CommunityCategorySlug>("all");
  const [sort, setSort] = useState<SortMode>("latest");

  const { data: myProfile } = useQuery<MeProfile>({
    queryKey: ["/api/profiles/me"],
    enabled: isAuthenticated,
    retry: false,
  });

  const listUrl = useMemo(() => {
    const qs = new URLSearchParams({ sort, limit: "80" });
    if (filter !== "all") qs.set("category", filter);
    if (!isKorean) qs.set("lang", "en");
    return `/api/community/posts?${qs.toString()}`;
  }, [filter, isKorean, sort]);

  const { data: posts, isLoading } = useQuery<CommunityPost[]>({
    queryKey: [listUrl],
    staleTime: 20_000,
  });

  useEffect(() => {
    if (isKorean || !posts?.length) return;
    const stillKo = posts.some((post) => {
      const d = resolveCommunityPostDisplay(post, false);
      return HANGUL_RE.test(d.title) || HANGUL_RE.test(d.body);
    });
    if (!stillKo) return;
    const timer = window.setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: [listUrl] });
    }, 2500);
    return () => window.clearInterval(timer);
  }, [isKorean, posts, listUrl]);

  const likeMutation = useMutation({
    mutationFn: async (postId: number) => {
      const res = await apiRequest("POST", `/api/community/posts/${postId}/like`);
      return res.json();
    },
    onMutate: async (postId) => optimisticToggleLike(queryClient, postId),
    onError: (err: Error, _id, snapshot) => {
      if (snapshot) rollbackLike(queryClient, snapshot);
      toast({ title: err.message, variant: "destructive" });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        predicate: (q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("/api/community/posts"),
      });
    },
  });

  const sharePost = async (postId: number, title: string) => {
    const url = `${window.location.origin}/community/${postId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast({ title: isKorean ? "링크를 복사했습니다." : "Link copied." });
    } catch {
      toast({ title: isKorean ? "공유에 실패했습니다." : "Share failed.", variant: "destructive" });
    }
  };

  const requireAuthForLike = (postId: number) => {
    if (!isAuthenticated) {
      toast({
        title: isKorean ? "로그인이 필요합니다." : "Login required.",
        variant: "destructive",
      });
      return;
    }
    likeMutation.mutate(postId);
  };

  const navItems = useMemo(
    () => [
      { id: "all" as const, ko: "홈", en: "Home", Icon: Home },
      ...COMMUNITY_CATEGORIES.map((c) => ({
        id: c.slug,
        ko: c.titleKo,
        en: c.title,
        Icon: CATEGORY_ICONS[c.slug],
      })),
    ],
    [],
  );

  const activeCategory = COMMUNITY_CATEGORIES.find((c) => c.slug === filter);
  const aboutTitle = filter === "all"
    ? isKorean ? "NEX 커뮤니티" : "NEX Community"
    : isKorean
      ? activeCategory?.titleKo
      : activeCategory?.title;
  const aboutBody = filter === "all"
    ? isKorean
      ? "창작 노트, 프롬프트, 배틀 토크, 아이디어를 나누는 공간입니다."
      : "Share creative notes, prompts, battle talk, and product ideas."
    : isKorean
      ? activeCategory?.descriptionKo
      : activeCategory?.description;

  const recentPosts = useMemo(() => (posts ?? []).slice(0, 20), [posts]);

  const shell = {
    bg: COMMUNITY_REDDIT_BG,
    card: COMMUNITY_REDDIT_CARD,
    border: COMMUNITY_REDDIT_BORDER,
    ink: COMMUNITY_REDDIT_INK,
    muted: COMMUNITY_REDDIT_MUTED,
    hover: COMMUNITY_REDDIT_HOVER,
  };

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden max-lg:overflow-y-auto max-lg:pb-24"
      style={{ backgroundColor: shell.bg, color: shell.ink }}
    >
      <div className="mx-auto grid min-h-0 w-full max-w-[1280px] flex-1 grid-cols-1 gap-4 overflow-hidden px-3 py-4 md:px-4 lg:grid-cols-[240px_minmax(0,1fr)_312px] lg:gap-5 lg:px-6 lg:py-5">
        {/* Left nav — fixed in viewport; does not scroll with the feed */}
        <aside className="hidden min-h-0 lg:block">
          <div
            className="flex h-full max-h-full flex-col overflow-hidden rounded-xl border"
            style={{ backgroundColor: shell.card, borderColor: shell.border }}
          >
            <nav className="min-h-0 flex-1 overflow-y-auto p-2">
              {navItems.map((item) => {
                const active = filter === item.id;
                const Icon = item.Icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition"
                    style={{
                      backgroundColor: active ? shell.hover : "transparent",
                      color: shell.ink,
                    }}
                  >
                    <Icon className="h-5 w-5 shrink-0" style={{ color: active ? shell.ink : shell.muted }} />
                    {isKorean ? item.ko : item.en}
                  </button>
                );
              })}
            </nav>
            <div className="shrink-0 border-t px-3 py-3" style={{ borderColor: shell.border }}>
              <button
                type="button"
                onClick={() => setComposeOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-neutral-800"
              >
                <PenLine className="h-4 w-4" />
                {isKorean ? "만들기" : "Create"}
              </button>
            </div>
          </div>
        </aside>

        {/* Center feed — only this column scrolls */}
        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-4 [scrollbar-gutter:stable]">
          <div
            className="rounded-xl border px-4 py-3 md:px-5"
            style={{ backgroundColor: shell.card, borderColor: shell.border }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold tracking-tight md:text-2xl">{aboutTitle}</h1>
                <p className="mt-0.5 text-sm" style={{ color: shell.muted }}>
                  {isKorean ? "피드 · 토론 · 트랙 공유" : "Feed · discussion · track share"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setComposeOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold lg:hidden"
                style={{ borderColor: shell.border, color: shell.ink, backgroundColor: shell.hover }}
              >
                <PenLine className="h-4 w-4" />
                {isKorean ? "만들기" : "Create"}
              </button>
            </div>
          </div>

          {/* Mobile category chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden [scrollbar-width:none]">
            {navItems.map((item) => {
              const active = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold"
                  style={{
                    backgroundColor: active ? shell.ink : shell.card,
                    color: active ? "#fff" : shell.ink,
                    border: `1px solid ${shell.border}`,
                  }}
                >
                  {isKorean ? item.ko : item.en}
                </button>
              );
            })}
          </div>

          <div
            className="flex items-center gap-2 rounded-xl border px-3 py-2"
            style={{ backgroundColor: shell.card, borderColor: shell.border }}
          >
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: shell.muted }}>
              {isKorean ? "정렬" : "Sort"}
            </span>
            <button
              type="button"
              onClick={() => setSort(sort === "latest" ? "popular" : "latest")}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold transition hover:bg-black/[0.04]"
              style={{ color: shell.ink }}
            >
              {sort === "latest"
                ? isKorean
                  ? "최신순"
                  : "New"
                : isKorean
                  ? "인기순"
                  : "Top"}
              <ChevronDown className="h-4 w-4" style={{ color: shell.muted }} />
            </button>
          </div>

          {isLoading ? (
            <div
              className="flex items-center gap-2 rounded-xl border px-4 py-10 text-sm"
              style={{ backgroundColor: shell.card, borderColor: shell.border, color: shell.muted }}
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              {isKorean ? "피드를 불러오는 중…" : "Loading feed…"}
            </div>
          ) : !posts?.length ? (
            <div
              className="rounded-xl border px-5 py-12 text-center"
              style={{ backgroundColor: shell.card, borderColor: shell.border }}
            >
              <p className="font-semibold">
                {isKorean ? "아직 글이 없습니다. 첫 글을 남겨 보세요." : "No posts yet. Be the first."}
              </p>
              <button
                type="button"
                onClick={() => setComposeOpen(true)}
                className="mt-4 rounded-full bg-neutral-900 px-4 py-2 text-xs font-bold text-white"
              >
                {isKorean ? "만들기" : "Create"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <CommunityFeedCard
                  key={post.id}
                  post={post}
                  isKorean={isKorean}
                  onOpen={() => setLocation(`/community/${post.id}`)}
                  onLike={() => requireAuthForLike(post.id)}
                  onShare={() => void sharePost(post.id, post.title)}
                />
              ))}
            </div>
          )}
          </div>
        </section>

        {/* Right sidebar — fixed; Recent posts scrolls inside its own panel */}
        <aside className="hidden min-h-0 lg:block">
          <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
            <div
              className="shrink-0 overflow-hidden rounded-xl border"
              style={{ backgroundColor: shell.card, borderColor: shell.border }}
            >
              <div className="bg-neutral-800 px-4 py-3 text-sm font-bold text-white">
                {isKorean ? "커뮤니티 정보" : "About community"}
              </div>
              <div className="space-y-3 px-4 py-4 text-sm">
                <p className="font-bold">{aboutTitle}</p>
                <p style={{ color: shell.muted }}>{aboutBody}</p>
                <div className="grid grid-cols-2 gap-3 border-t pt-3" style={{ borderColor: shell.border }}>
                  <div>
                    <p className="text-lg font-bold tabular-nums">{posts?.length ?? "—"}</p>
                    <p className="text-xs" style={{ color: shell.muted }}>
                      {isKorean ? "피드 글" : "In feed"}
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{COMMUNITY_CATEGORIES.length}</p>
                    <p className="text-xs" style={{ color: shell.muted }}>
                      {isKorean ? "주제" : "Topics"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setComposeOpen(true)}
                  className="w-full rounded-full bg-neutral-900 py-2 text-sm font-bold text-white hover:bg-neutral-800"
                >
                  {isKorean ? "가입하고 글쓰기" : "Write a post"}
                </button>
              </div>
            </div>

            <div
              className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border"
              style={{ backgroundColor: shell.card, borderColor: shell.border }}
            >
              <div
                className="flex shrink-0 items-center justify-between border-b px-4 py-3"
                style={{ borderColor: shell.border }}
              >
                <p className="text-sm font-bold">{isKorean ? "최근 게시물" : "Recent posts"}</p>
              </div>
              <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
                {recentPosts.length === 0 ? (
                  <li className="px-4 py-6 text-sm" style={{ color: shell.muted }}>
                    {isKorean ? "아직 없습니다." : "Nothing yet."}
                  </li>
                ) : (
                  recentPosts.map((post, idx) => {
                    const { title } = resolveCommunityPostDisplay(post, isKorean);
                    return (
                      <li key={post.id}>
                        <button
                          type="button"
                          onClick={() => setLocation(`/community/${post.id}`)}
                          className="w-full px-4 py-3 text-left transition hover:bg-black/[0.02]"
                          style={{
                            borderTop: idx === 0 ? undefined : `1px solid ${shell.border}`,
                          }}
                        >
                          <p className="line-clamp-2 text-sm font-semibold leading-snug">{title}</p>
                          <p className="mt-1 text-xs" style={{ color: shell.muted }}>
                            {post.likeCount} {isKorean ? "좋아요" : "likes"} · {post.commentCount}{" "}
                            {isKorean ? "댓글" : "comments"}
                          </p>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>
        </aside>
      </div>

      <CommunityComposer
        open={composeOpen}
        onOpenChange={setComposeOpen}
        isKorean={isKorean}
        canPost={Boolean(isAuthenticated && myProfile)}
        needLogin={!isAuthenticated}
        needProfile={Boolean(isAuthenticated && !myProfile)}
      />

      <Dialog
        open={Number.isFinite(detailId)}
        onOpenChange={(open) => {
          if (!open) setLocation("/community");
        }}
      >
        <DialogContent
          className="max-h-[92vh] w-[95vw] max-w-3xl overflow-y-auto border p-0 sm:rounded-xl"
          style={{ backgroundColor: shell.card, borderColor: shell.border, color: shell.ink }}
        >
          {Number.isFinite(detailId) ? (
            <CommunityPostPanel postId={detailId} layout="modal" onClose={() => setLocation("/community")} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
