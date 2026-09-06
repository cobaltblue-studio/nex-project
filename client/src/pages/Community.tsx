import { useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, PenLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { optimisticToggleLike, rollbackLike } from "@/lib/communityOptimistic";
import { CommunityPostPanel, type CommunityPost } from "@/components/CommunityPostPanel";
import { CommunityFeedCard } from "@/components/CommunityFeedCard";
import { CommunityComposer } from "@/components/CommunityComposer";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_IVORY,
  type CommunityCategorySlug,
} from "@shared/community";

type MeProfile = { id: number; username: string; role?: string } | null;

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

  const { data: myProfile } = useQuery<MeProfile>({
    queryKey: ["/api/profiles/me"],
    enabled: isAuthenticated,
    retry: false,
  });

  const listUrl = useMemo(() => {
    const qs = new URLSearchParams({ sort: "latest", limit: "80" });
    if (filter !== "all") qs.set("category", filter);
    return `/api/community/posts?${qs.toString()}`;
  }, [filter]);

  const { data: posts, isLoading } = useQuery<CommunityPost[]>({
    queryKey: [listUrl],
    staleTime: 20_000,
  });

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

  const filters = [
    { id: "all" as const, ko: "전체", en: "All" },
    ...COMMUNITY_CATEGORIES.map((c) => ({
      id: c.slug,
      ko: c.titleKo,
      en: c.title,
    })),
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">
            {isKorean ? "커뮤니티" : "Community"}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {isKorean
              ? "짧게 쓰고, 트랙 자랑하고, 토론하세요."
              : "Talk, showcase tracks, and discuss."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-[#F7F1E3] px-4 py-2.5 text-sm font-bold text-stone-900 transition hover:bg-white"
        >
          <PenLine className="h-4 w-4" />
          {isKorean ? "글쓰기" : "Write"}
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((item) => {
          const active = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                active
                  ? "bg-[#F7F1E3] text-stone-900"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
              }`}
            >
              {isKorean ? item.ko : item.en}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-10 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          {isKorean ? "피드를 불러오는 중…" : "Loading feed…"}
        </div>
      ) : !posts?.length ? (
        <div
          className="rounded-2xl border border-stone-300/40 px-5 py-12 text-center text-sm"
          style={{ backgroundColor: COMMUNITY_IVORY, color: "#1C1917" }}
        >
          <p className="font-semibold">
            {isKorean ? "아직 글이 없습니다. 첫 글을 남겨 보세요." : "No posts yet. Be the first."}
          </p>
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="mt-4 rounded-full bg-stone-900 px-4 py-2 text-xs font-bold text-[#F7F1E3]"
          >
            {isKorean ? "글쓰기" : "Write"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <CommunityFeedCard
              key={post.id}
              post={post}
              isKorean={isKorean}
              onOpen={() => setLocation(`/community/${post.id}`)}
              onLike={() => {
                if (!isAuthenticated) {
                  toast({
                    title: isKorean ? "로그인이 필요합니다." : "Login required.",
                    variant: "destructive",
                  });
                  return;
                }
                likeMutation.mutate(post.id);
              }}
              onShare={() => void sharePost(post.id, post.title)}
            />
          ))}
        </div>
      )}

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
        <DialogContent className="max-h-[92vh] w-[95vw] max-w-3xl overflow-y-auto border-stone-300 p-0 sm:rounded-2xl" style={{ backgroundColor: COMMUNITY_IVORY }}>
          {Number.isFinite(detailId) ? (
            <CommunityPostPanel postId={detailId} layout="modal" onClose={() => setLocation("/community")} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
