import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Heart, Loader2, MessageSquare, Pin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { COMMUNITY_CATEGORIES, type CommunityCategorySlug } from "@shared/community";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type CommunityPost = {
  id: number;
  category: CommunityCategorySlug;
  title: string;
  body: string;
  externalUrl: string | null;
  createdAt: string;
  updatedAt: string;
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
    year: "numeric",
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

export function CommunityPostDetail() {
  const { i18n } = useTranslation();
  const isKorean = i18n.language?.startsWith("ko");
  const locale = i18n.language || "en";
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, params] = useRoute("/community/:id");
  const postId = Number(params?.id);
  const [comment, setComment] = useState("");

  const copy = useMemo(
    () =>
      isKorean
        ? {
            back: "커뮤니티로 돌아가기",
            comments: "댓글",
            loginNeeded: "좋아요와 댓글은 로그인 후 사용할 수 있습니다.",
            commentPlaceholder: "대화에 참여해 보세요",
            submitComment: "댓글 남기기",
            openTrack: "첨부 트랙 보기",
            openExternal: "외부 링크 열기",
            hidden: "이 글은 관리자에 의해 숨김 처리되었습니다.",
            hiddenComment: "숨김 댓글",
            like: "좋아요",
            hide: "숨기기",
            unhide: "숨김 해제",
            pin: "상단 고정",
            unpin: "고정 해제",
          }
        : {
            back: "Back to community",
            comments: "Comments",
            loginNeeded: "Login is required to like or comment.",
            commentPlaceholder: "Join the conversation",
            submitComment: "Post comment",
            openTrack: "Open attached track",
            openExternal: "Open external link",
            hidden: "This post is hidden by an admin.",
            hiddenComment: "Hidden comment",
            like: "Like",
            hide: "Hide",
            unhide: "Unhide",
            pin: "Pin",
            unpin: "Unpin",
          },
    [isKorean],
  );

  const categoryMap = useMemo(
    () =>
      new Map(
        COMMUNITY_CATEGORIES.map((item) => [item.slug, isKorean ? item.titleKo : item.title]),
      ),
    [isKorean],
  );

  const postUrl = Number.isFinite(postId) ? `/api/community/posts/${postId}` : "";
  const commentsUrl = Number.isFinite(postId) ? `/api/community/posts/${postId}/comments` : "";
  const { data: post, isLoading } = useQuery<CommunityPost>({
    queryKey: [postUrl],
    enabled: Boolean(postUrl),
    retry: false,
  });
  const { data: comments } = useQuery<CommunityComment[]>({
    queryKey: [commentsUrl],
    enabled: Boolean(commentsUrl),
    retry: false,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/community/posts/${postId}/like`);
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [postUrl] });
    },
    onError: (err: any) => toast({ title: String(err?.message ?? "Failed to update like"), variant: "destructive" }),
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/community/posts/${postId}/comments`, { content: comment });
    },
    onSuccess: async () => {
      setComment("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [postUrl] }),
        queryClient.invalidateQueries({ queryKey: [commentsUrl] }),
      ]);
    },
    onError: (err: any) => toast({ title: String(err?.message ?? "Failed to post comment"), variant: "destructive" }),
  });

  const postModerationMutation = useMutation({
    mutationFn: async (action: "hide" | "unhide" | "pin" | "unpin") => {
      await apiRequest("PATCH", `/api/community/posts/${postId}/moderate`, { action });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [postUrl] }),
        invalidateCommunityPostLists(),
      ]);
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

  if (!Number.isFinite(postId)) {
    return <div className="text-sm text-zinc-400">Invalid post id.</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading post...
      </div>
    );
  }

  if (!post) {
    return <div className="text-sm text-zinc-400">Post not found.</div>;
  }

  const admin = user?.role === "admin";
  const trackHref = post.attachedTrack
    ? post.attachedTrack.trackType === "video"
      ? `/mv/${post.attachedTrack.id}`
      : `/track/${post.attachedTrack.id}`
    : null;

  return (
    <div className="space-y-8 pb-12">
      <Link href="/community" className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        {copy.back}
      </Link>

      <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-primary">
            {categoryMap.get(post.category)}
          </span>
          {post.pinnedAt && (
            <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-yellow-100">
              <Pin className="h-3 w-3" />
              PINNED
            </span>
          )}
          {post.hiddenAt && (
            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-red-200">{copy.hidden}</span>
          )}
        </div>

        <h1 className="mt-4 text-3xl font-black tracking-tight text-white">{post.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
          <span>@{post.authorName ?? "unknown"}</span>
          <span>{formatTime(post.createdAt, locale)}</span>
          <span>
            {copy.like} {post.likeCount}
          </span>
          <span>
            {copy.comments} {post.commentCount}
          </span>
        </div>

        {post.hiddenAt && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
            {copy.hidden}
            {post.hiddenReason ? ` ${post.hiddenReason}` : ""}
          </div>
        )}

        <div className="mt-6 whitespace-pre-wrap text-sm leading-8 text-zinc-200">{post.body}</div>

        {(trackHref || post.externalUrl) && (
          <div className="mt-6 flex flex-wrap gap-2">
            {trackHref && (
              <Link
                href={trackHref}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-primary/40 hover:text-primary"
              >
                {copy.openTrack}: {post.attachedTrack?.title}
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
                {copy.openExternal}
              </a>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!isAuthenticated || likeMutation.isPending}
            onClick={() => likeMutation.mutate()}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
              post.viewerHasLiked
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-white/10 bg-white/5 text-zinc-300 hover:border-primary/40 hover:text-primary"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <Heart className={`h-4 w-4 ${post.viewerHasLiked ? "fill-current" : ""}`} />
            {copy.like}
          </button>

          {admin && (
            <>
              <button
                type="button"
                onClick={() => postModerationMutation.mutate(post.hiddenAt ? "unhide" : "hide")}
                className="rounded-full border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm text-red-200 transition hover:bg-red-500/10"
              >
                {post.hiddenAt ? copy.unhide : copy.hide}
              </button>
              <button
                type="button"
                onClick={() => postModerationMutation.mutate(post.pinnedAt ? "unpin" : "pin")}
                className="rounded-full border border-yellow-500/20 bg-yellow-500/5 px-4 py-2 text-sm text-yellow-100 transition hover:bg-yellow-500/10"
              >
                {post.pinnedAt ? copy.unpin : copy.pin}
              </button>
            </>
          )}
        </div>
      </article>

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 md:p-8">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h2 className="text-xl font-black text-white">{copy.comments}</h2>
        </div>

        {!isAuthenticated ? (
          <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-zinc-200">{copy.loginNeeded}</div>
        ) : (
          <div className="mt-5 space-y-3">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder={copy.commentPlaceholder}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-primary/50"
            />
            <button
              type="button"
              disabled={commentMutation.isPending}
              onClick={() => commentMutation.mutate()}
              className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-5 py-3 text-sm font-bold text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {commentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {copy.submitComment}
            </button>
          </div>
        )}

        <div className="mt-8 space-y-4">
          {(comments ?? []).map((item) => (
            <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
                <div className="flex flex-wrap items-center gap-3">
                  <span>@{item.authorName ?? "unknown"}</span>
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
                    className="rounded-full border border-red-500/20 bg-red-500/5 px-3 py-1 text-xs text-red-200 transition hover:bg-red-500/10"
                  >
                    {item.hiddenAt ? copy.unhide : copy.hide}
                  </button>
                )}
              </div>
              {item.hiddenAt ? (
                <p className="mt-3 text-sm text-red-200">
                  {copy.hiddenComment}
                  {item.hiddenReason ? ` · ${item.hiddenReason}` : ""}
                </p>
              ) : (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-200">{item.content}</p>
              )}
            </div>
          ))}
          {!comments?.length && <div className="text-sm text-zinc-500">No comments yet.</div>}
        </div>
      </section>
    </div>
  );
}

