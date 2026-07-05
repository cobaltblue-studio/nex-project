import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Heart,
  Loader2,
  MessageSquare,
  Music2,
  Pin,
  Share2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  COMMUNITY_CATEGORIES,
  formatCommunitySeedBody,
  formatCommunitySeedTitle,
  getCommunitySystemSeed,
  type CommunityCategorySlug,
} from "@shared/community";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { optimisticAddComment, optimisticToggleLike, rollbackComment, rollbackLike } from "@/lib/communityOptimistic";

export type CommunityPost = {
  id: number;
  category: CommunityCategorySlug;
  title: string;
  body: string;
  externalUrl: string | null;
  createdAt: string;
  updatedAt?: string;
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

type CommunityComment = {
  id: number;
  content: string;
  createdAt: string;
  hiddenAt: string | null;
  hiddenReason: string | null;
  authorUserId: string;
  authorName: string | null;
  authorProfileId: number | null;
  authorIsVerified: boolean;
};

function formatTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale.startsWith("ko") ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function invalidateCommunityPostLists() {
  return queryClient.invalidateQueries({
    predicate: (query) =>
      typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("/api/community/posts"),
  });
}

type CommunityPostPanelProps = {
  postId: number;
  layout?: "modal" | "page";
  onClose?: () => void;
};

export function CommunityPostPanel({ postId, layout = "modal", onClose }: CommunityPostPanelProps) {
  const { i18n } = useTranslation();
  const isKorean = i18n.language?.startsWith("ko");
  const locale = i18n.language || "en";
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [comment, setComment] = useState("");

  const { data: myProfile } = useQuery<{ id: number; username: string } | null>({
    queryKey: ["/api/profiles/me"],
    enabled: isAuthenticated,
    retry: false,
  });

  const copy = useMemo(
    () =>
      isKorean
        ? {
            pinned: "고정",
            creatorNote: "크리에이터 노트",
            comments: "댓글",
            loginNeeded: "좋아요와 댓글은 로그인 후 사용할 수 있습니다.",
            commentPlaceholder: "댓글을 남겨 보세요",
            submitComment: "댓글 올리기",
            openTrack: "관련 곡",
            openExternal: "외부 링크",
            hidden: "이 글은 관리자에 의해 숨김 처리되었습니다.",
            hiddenComment: "숨김 댓글",
            like: "좋아요",
            share: "공유",
            hide: "숨기기",
            unhide: "숨김 해제",
            pin: "상단 고정",
            unpin: "고정 해제",
            invalidPost: "잘못된 글 주소입니다.",
            loadingPost: "글을 불러오는 중...",
            notFound: "글을 찾을 수 없습니다.",
            noComments: "아직 댓글이 없습니다.",
            shareCopied: "링크를 복사했습니다.",
            shareFailed: "공유에 실패했습니다.",
          }
        : {
            pinned: "Pinned",
            creatorNote: "Creator note",
            comments: "Comments",
            loginNeeded: "Login is required to like or comment.",
            commentPlaceholder: "Add a comment",
            submitComment: "Post comment",
            openTrack: "Related track",
            openExternal: "Open external link",
            hidden: "This post is hidden by an admin.",
            hiddenComment: "Hidden comment",
            like: "Like",
            share: "Share",
            hide: "Hide",
            unhide: "Unhide",
            pin: "Pin",
            unpin: "Unpin",
            invalidPost: "Invalid post id.",
            loadingPost: "Loading post...",
            notFound: "Post not found.",
            noComments: "No comments yet.",
            shareCopied: "Link copied.",
            shareFailed: "Could not share.",
          },
    [isKorean],
  );

  const categoryMap = useMemo(
    () => new Map(COMMUNITY_CATEGORIES.map((item) => [item.slug, isKorean ? item.titleKo : item.title])),
    [isKorean],
  );

  const postUrl = Number.isFinite(postId) ? `/api/community/posts/${postId}` : "";
  const commentsUrl = Number.isFinite(postId) ? `/api/community/posts/${postId}/comments` : "";

  const { data: post, isLoading } = useQuery<CommunityPost>({
    queryKey: [postUrl],
    enabled: Boolean(postUrl),
    retry: false,
    staleTime: 30_000,
  });

  const { data: comments } = useQuery<CommunityComment[]>({
    queryKey: [commentsUrl],
    enabled: Boolean(commentsUrl),
    retry: false,
    staleTime: 30_000,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/community/posts/${postId}/like`);
      return res.json();
    },
    onMutate: async () => {
      return optimisticToggleLike(queryClient, postId);
    },
    onError: (err: any, _vars, snapshot) => {
      if (snapshot) rollbackLike(queryClient, snapshot);
      toast({ title: String(err?.message ?? "Failed to update like"), variant: "destructive" });
    },
    onSettled: () => {
      void Promise.all([queryClient.invalidateQueries({ queryKey: [postUrl] }), invalidateCommunityPostLists()]);
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/community/posts/${postId}/comments`, { content });
    },
    onMutate: async (content) => {
      const draft = {
        id: -Date.now(),
        content,
        createdAt: new Date().toISOString(),
        hiddenAt: null,
        hiddenReason: null,
        authorUserId: user?.id ?? "",
        authorName: myProfile?.username ?? user?.email ?? "you",
        authorProfileId: myProfile?.id ?? null,
        authorIsVerified: false,
      };
      const snapshot = await optimisticAddComment(queryClient, postId, commentsUrl, postUrl, draft);
      setComment("");
      return snapshot;
    },
    onError: (err: any, _content, snapshot) => {
      if (snapshot) rollbackComment(queryClient, snapshot);
      toast({ title: String(err?.message ?? "Failed to post comment"), variant: "destructive" });
    },
    onSettled: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: [postUrl] }),
        queryClient.invalidateQueries({ queryKey: [commentsUrl] }),
        invalidateCommunityPostLists(),
      ]);
    },
  });

  const postModerationMutation = useMutation({
    mutationFn: async (action: "hide" | "unhide" | "pin" | "unpin") => {
      await apiRequest("PATCH", `/api/community/posts/${postId}/moderate`, { action });
    },
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: [postUrl] }), invalidateCommunityPostLists()]);
    },
    onError: (err: any) => toast({ title: String(err?.message ?? "Failed to moderate post"), variant: "destructive" }),
  });

  const commentModerationMutation = useMutation({
    mutationFn: async ({ commentId, action }: { commentId: number; action: "hide" | "unhide" }) => {
      await apiRequest("PATCH", `/api/community/comments/${commentId}/moderate`, { action });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [commentsUrl] });
    },
    onError: (err: any) => toast({ title: String(err?.message ?? "Failed to moderate comment"), variant: "destructive" }),
  });

  const sharePost = async () => {
    const url = `${window.location.origin}/community/${postId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post?.title ?? "NEX Community", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast({ title: copy.shareCopied });
    } catch {
      toast({ title: copy.shareFailed, variant: "destructive" });
    }
  };

  if (!Number.isFinite(postId)) {
    return <div className="p-6 text-sm text-zinc-400">{copy.invalidPost}</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-8 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        {copy.loadingPost}
      </div>
    );
  }

  if (!post) {
    return <div className="p-6 text-sm text-zinc-400">{copy.notFound}</div>;
  }

  const admin = user?.role === "admin";
  const seed = getCommunitySystemSeed(post.category, post.authorUserId);
  const displayTitle = seed ? formatCommunitySeedTitle(seed, isKorean) : post.title;
  const displayBody = seed ? formatCommunitySeedBody(seed, isKorean) : post.body;
  const trackHref = post.attachedTrack
    ? post.attachedTrack.trackType === "video"
      ? `/mv/${post.attachedTrack.id}`
      : `/track/${post.attachedTrack.id}`
    : null;

  return (
    <div className={layout === "page" ? "space-y-6 pb-12" : ""}>
      <article className={layout === "modal" ? "px-5 pt-5 md:px-6 md:pt-6" : "rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8"}>
        <div className="flex gap-3">
          <div className="flex shrink-0 flex-col items-center gap-0.5 pt-1">
            <button
              type="button"
              disabled={!isAuthenticated}
              onClick={() => likeMutation.mutate()}
              className={`rounded-md p-1 transition hover:bg-primary/10 ${
                post.viewerHasLiked ? "text-primary" : "text-zinc-500 hover:text-primary"
              } disabled:cursor-not-allowed disabled:opacity-50`}
              aria-label="Upvote"
            >
              <ChevronUp className={`h-6 w-6 ${post.viewerHasLiked ? "fill-current" : ""}`} strokeWidth={2.5} />
            </button>
            <span className={`text-xs font-bold tabular-nums ${post.viewerHasLiked ? "text-primary" : "text-zinc-300"}`}>
              {post.likeCount}
            </span>
            <button
              type="button"
              disabled={!isAuthenticated || !post.viewerHasLiked}
              onClick={() => post.viewerHasLiked && likeMutation.mutate()}
              className="rounded-md p-1 text-zinc-600 transition hover:bg-white/5 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Downvote"
            >
              <ChevronDown className="h-6 w-6" strokeWidth={2.5} />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="font-semibold text-zinc-300">{categoryMap.get(post.category)}</span>
              <span>·</span>
              <span>@{post.authorName ?? "unknown"}</span>
              <span>·</span>
              <span>{formatTime(post.createdAt, locale)}</span>
              {post.isTrackCreatorPost && post.attachedTrack ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-cyan-100">
                  <Pin className="h-3 w-3" />
                  {copy.creatorNote}
                </span>
              ) : post.pinnedAt ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-yellow-100">
                  <Pin className="h-3 w-3" />
                  {copy.pinned}
                </span>
              ) : null}
            </div>

            <h1 className={`mt-2 font-black tracking-tight text-white ${layout === "modal" ? "text-xl md:text-2xl" : "text-3xl"}`}>
              {displayTitle}
            </h1>

            {trackHref && post.attachedTrack && (
              <Link
                href={trackHref}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
              >
                <Music2 className="h-3.5 w-3.5" />
                {copy.openTrack}: {post.attachedTrack.title}
              </Link>
            )}

            {post.hiddenAt && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-100">
                {copy.hidden}
                {post.hiddenReason ? ` ${post.hiddenReason}` : ""}
              </div>
            )}

            <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-200">{displayBody}</div>

            {post.externalUrl && (
              <a
                href={post.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-primary/40 hover:text-primary"
              >
                <ExternalLink className="h-3 w-3" />
                {copy.openExternal}
              </a>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
              <button
                type="button"
                disabled={!isAuthenticated}
                onClick={() => likeMutation.mutate()}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  post.viewerHasLiked
                    ? "bg-primary/10 text-primary"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <Heart className={`h-4 w-4 ${post.viewerHasLiked ? "fill-current" : ""}`} />
                {copy.like}
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-zinc-400">
                <MessageSquare className="h-4 w-4" />
                {post.commentCount} {copy.comments}
              </span>
              <button
                type="button"
                onClick={() => void sharePost()}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
              >
                <Share2 className="h-4 w-4" />
                {copy.share}
              </button>
              {admin && (
                <>
                  <button
                    type="button"
                    onClick={() => postModerationMutation.mutate(post.hiddenAt ? "unhide" : "hide")}
                    className="rounded-full border border-red-500/20 px-3 py-1.5 text-xs text-red-200 transition hover:bg-red-500/10"
                  >
                    {post.hiddenAt ? copy.unhide : copy.hide}
                  </button>
                  <button
                    type="button"
                    onClick={() => postModerationMutation.mutate(post.pinnedAt ? "unpin" : "pin")}
                    className="rounded-full border border-yellow-500/20 px-3 py-1.5 text-xs text-yellow-100 transition hover:bg-yellow-500/10"
                  >
                    {post.pinnedAt ? copy.unpin : copy.pin}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </article>

      <section className={layout === "modal" ? "border-t border-white/10 px-5 py-5 md:px-6 md:py-6" : "rounded-3xl border border-white/10 bg-black/30 p-6 md:p-8"}>
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
          <MessageSquare className="h-4 w-4 text-primary" />
          {copy.comments}
        </h2>

        {!isAuthenticated ? (
          <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-zinc-200">{copy.loginNeeded}</div>
        ) : (
          <div className="mt-4 space-y-3">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={copy.commentPlaceholder}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-primary/50"
            />
            <button
              type="button"
              disabled={!comment.trim()}
              onClick={() => {
                const text = comment.trim();
                if (text) commentMutation.mutate(text);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-5 py-2 text-sm font-bold text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {commentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {copy.submitComment}
            </button>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {(comments ?? []).map((item) => (
            <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-zinc-300">@{item.authorName ?? "unknown"}</span>
                  <span>·</span>
                  <span>{formatTime(item.createdAt, locale)}</span>
                </div>
                {admin && (
                  <button
                    type="button"
                    onClick={() =>
                      commentModerationMutation.mutate({
                        commentId: item.id,
                        action: item.hiddenAt ? "unhide" : "hide",
                      })
                    }
                    className="rounded-full border border-red-500/20 px-2 py-0.5 text-[10px] text-red-200"
                  >
                    {item.hiddenAt ? copy.unhide : copy.hide}
                  </button>
                )}
              </div>
              {item.hiddenAt ? (
                <p className="mt-2 text-sm text-red-200">
                  {copy.hiddenComment}
                  {item.hiddenReason ? ` · ${item.hiddenReason}` : ""}
                </p>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-200">{item.content}</p>
              )}
            </div>
          ))}
          {!comments?.length && <div className="text-sm text-zinc-500">{copy.noComments}</div>}
        </div>
      </section>

      {layout === "page" && onClose ? null : null}
    </div>
  );
}
