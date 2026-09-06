import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
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
  COMMUNITY_IVORY,
  COMMUNITY_IVORY_INK,
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
  kind?: string;
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
    <div
      className={layout === "page" ? "space-y-6 pb-12" : ""}
      style={{ color: COMMUNITY_IVORY_INK }}
    >
      <article
        className={layout === "modal" ? "px-5 pt-5 md:px-6 md:pt-6" : "rounded-3xl border border-stone-300/70 p-6 md:p-8"}
        style={{ backgroundColor: COMMUNITY_IVORY }}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
            <span className="font-semibold text-stone-800">{categoryMap.get(post.category)}</span>
            <span>·</span>
            <span>@{post.authorName ?? "unknown"}</span>
            <span>·</span>
            <span>{formatTime(post.createdAt, locale)}</span>
            {post.pinnedAt ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                <Pin className="h-3 w-3" />
                {copy.pinned}
              </span>
            ) : null}
          </div>

          <h1 className={`mt-2 font-black tracking-tight text-stone-900 ${layout === "modal" ? "text-xl md:text-2xl" : "text-3xl"}`}>
            {displayTitle}
          </h1>

          {trackHref && post.attachedTrack && (
            <Link
              href={trackHref}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-stone-400/60 bg-white/60 px-3 py-1.5 text-xs font-semibold text-stone-800 transition hover:bg-white"
            >
              <Music2 className="h-3.5 w-3.5" />
              {copy.openTrack}: {post.attachedTrack.title}
            </Link>
          )}

          {post.hiddenAt && (
            <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              {copy.hidden}
              {post.hiddenReason ? ` ${post.hiddenReason}` : ""}
            </div>
          )}

          <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-stone-800">{displayBody}</div>

          {post.externalUrl && (
            <a
              href={post.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1 rounded-full border border-stone-300 bg-white/50 px-3 py-1.5 text-xs text-stone-700"
            >
              <ExternalLink className="h-3 w-3" />
              {copy.openExternal}
            </a>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-stone-300/70 pt-4">
            <button
              type="button"
              disabled={!isAuthenticated}
              onClick={() => likeMutation.mutate()}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                post.viewerHasLiked
                  ? "bg-rose-100 text-rose-700"
                  : "text-stone-600 hover:bg-stone-200/70"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <Heart className={`h-4 w-4 ${post.viewerHasLiked ? "fill-current" : ""}`} />
              {copy.like} {post.likeCount}
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-stone-600">
              <MessageSquare className="h-4 w-4" />
              {post.commentCount} {copy.comments}
            </span>
            <button
              type="button"
              onClick={() => void sharePost()}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-200/70"
            >
              <Share2 className="h-4 w-4" />
              {copy.share}
            </button>
            {admin ? (
              <>
                <button
                  type="button"
                  onClick={() => postModerationMutation.mutate(post.hiddenAt ? "unhide" : "hide")}
                  className="rounded-full border border-red-300 px-3 py-1.5 text-xs text-red-700"
                >
                  {post.hiddenAt ? copy.unhide : copy.hide}
                </button>
                <button
                  type="button"
                  onClick={() => postModerationMutation.mutate(post.pinnedAt ? "unpin" : "pin")}
                  className="rounded-full border border-amber-300 px-3 py-1.5 text-xs text-amber-800"
                >
                  {post.pinnedAt ? copy.unpin : copy.pin}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </article>

      <section
        className={layout === "modal" ? "border-t border-stone-300/70 px-5 py-5 md:px-6 md:py-6" : "rounded-3xl border border-stone-300/70 p-6 md:p-8"}
        style={{ backgroundColor: COMMUNITY_IVORY }}
      >
        <h2 className="text-sm font-bold text-stone-900">{copy.comments}</h2>
        {!isAuthenticated ? (
          <div className="mt-4 rounded-xl border border-stone-300 bg-white/50 p-4 text-sm text-stone-700">{copy.loginNeeded}</div>
        ) : (
          <div className="mt-4 space-y-2">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={copy.commentPlaceholder}
              className="w-full rounded-xl border border-stone-300 bg-white/70 px-4 py-3 text-sm leading-6 text-stone-900 outline-none focus:border-stone-500"
            />
            <button
              type="button"
              disabled={!comment.trim() || commentMutation.isPending}
              onClick={() => {
                const text = comment.trim();
                if (text) commentMutation.mutate(text);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-2 text-sm font-bold text-[#F7F1E3] disabled:opacity-60"
            >
              {commentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {copy.submitComment}
            </button>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {(comments ?? []).map((item) => (
            <div key={item.id} className="rounded-xl border border-stone-300/70 bg-white/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-stone-800">@{item.authorName ?? "unknown"}</span>
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
                    className="rounded-full border border-red-300 px-2 py-0.5 text-[10px] text-red-700"
                  >
                    {item.hiddenAt ? copy.unhide : copy.hide}
                  </button>
                )}
              </div>
              {item.hiddenAt ? (
                <p className="mt-2 text-sm text-red-700">
                  {copy.hiddenComment}
                  {item.hiddenReason ? ` · ${item.hiddenReason}` : ""}
                </p>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-800">{item.content}</p>
              )}
            </div>
          ))}
          {!comments?.length && <div className="text-sm text-stone-600">{copy.noComments}</div>}
        </div>
      </section>
    </div>
  );
}
