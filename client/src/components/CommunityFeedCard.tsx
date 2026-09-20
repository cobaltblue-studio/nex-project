import { ArrowBigUp, MessageSquare, Pin, Share2 } from "lucide-react";
import { Link } from "wouter";
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_REDDIT_BORDER,
  COMMUNITY_REDDIT_CARD,
  COMMUNITY_REDDIT_HOVER,
  COMMUNITY_REDDIT_INK,
  COMMUNITY_REDDIT_MUTED,
  COMMUNITY_REDDIT_UPVOTE,
  resolveCommunityPostDisplay,
  type CommunityCategorySlug,
  type CommunityPostKind,
} from "@shared/community";
import type { CommunityPost } from "@/components/CommunityPostPanel";

const KIND_LABEL: Record<CommunityPostKind, { ko: string; en: string }> = {
  talk: { ko: "토크", en: "Talk" },
  track: { ko: "트랙", en: "Track" },
  discussion: { ko: "토론", en: "Discussion" },
};

function formatTime(value: string, isKorean: boolean) {
  return new Date(value).toLocaleString(isKorean ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function excerpt(body: string, max = 220) {
  const text = body.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

export function CommunityFeedCard({
  post,
  isKorean,
  onOpen,
  onLike,
  onShare,
}: {
  post: CommunityPost & { kind?: string };
  isKorean: boolean;
  onOpen: () => void;
  onLike: () => void;
  onShare: () => void;
}) {
  const kind = (post.kind as CommunityPostKind) || "talk";
  const kindLabel = KIND_LABEL[kind]?.[isKorean ? "ko" : "en"] ?? kind;
  const category = COMMUNITY_CATEGORIES.find((c) => c.slug === post.category);
  const categoryLabel = isKorean ? category?.titleKo : category?.title;
  const { title, body } = resolveCommunityPostDisplay(post, isKorean);
  const trackHref = post.attachedTrack
    ? post.attachedTrack.trackType === "video"
      ? `/mv/${post.attachedTrack.id}`
      : `/track/${post.attachedTrack.id}`
    : null;

  return (
    <article
      className="overflow-hidden rounded-xl border"
      style={{
        backgroundColor: COMMUNITY_REDDIT_CARD,
        borderColor: COMMUNITY_REDDIT_BORDER,
        color: COMMUNITY_REDDIT_INK,
      }}
    >
      <div className="flex">
        <div
          className="flex w-10 shrink-0 flex-col items-center gap-0.5 py-3"
          style={{ backgroundColor: COMMUNITY_REDDIT_HOVER }}
        >
          <button
            type="button"
            onClick={onLike}
            className="rounded p-0.5 transition hover:bg-black/5"
            aria-label={isKorean ? "좋아요" : "Upvote"}
            style={{ color: post.viewerHasLiked ? COMMUNITY_REDDIT_UPVOTE : COMMUNITY_REDDIT_MUTED }}
          >
            <ArrowBigUp className={`h-6 w-6 ${post.viewerHasLiked ? "fill-current" : ""}`} />
          </button>
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color: post.viewerHasLiked ? COMMUNITY_REDDIT_UPVOTE : COMMUNITY_REDDIT_INK }}
          >
            {post.likeCount}
          </span>
        </div>

        <div className="min-w-0 flex-1 px-3 py-2.5 md:px-4 md:py-3">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs" style={{ color: COMMUNITY_REDDIT_MUTED }}>
            <span className="font-semibold" style={{ color: COMMUNITY_REDDIT_INK }}>
              {categoryLabel || "NEX"}
            </span>
            <span>·</span>
            <span>
              {isKorean ? "작성" : "Posted by"} u/{post.authorName || "nex"}
            </span>
            <span>·</span>
            <span>{formatTime(post.createdAt, isKorean)}</span>
            {post.pinnedAt ? (
              <span
                className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: "#FFF7E6", color: "#B45309" }}
              >
                <Pin className="h-3 w-3" />
                {isKorean ? "고정" : "Pinned"}
              </span>
            ) : null}
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ backgroundColor: COMMUNITY_REDDIT_HOVER, color: COMMUNITY_REDDIT_MUTED }}
            >
              {kindLabel}
            </span>
          </div>

          <button type="button" onClick={onOpen} className="mt-1.5 w-full text-left">
            <h3 className="text-[17px] font-semibold leading-snug md:text-lg" style={{ color: COMMUNITY_REDDIT_INK }}>
              {title}
            </h3>
            <p className="mt-1.5 text-sm leading-6" style={{ color: "#3C3C3C" }}>
              {excerpt(body)}
            </p>
          </button>

          {post.attachedTrack && trackHref ? (
            <Link
              href={trackHref}
              className="mt-3 flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition hover:bg-black/[0.02]"
              style={{ borderColor: COMMUNITY_REDDIT_BORDER, color: COMMUNITY_REDDIT_INK }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-900 text-xs font-bold text-white">
                ▶
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{post.attachedTrack.title}</span>
            </Link>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold transition hover:bg-black/[0.04]"
              style={{ color: COMMUNITY_REDDIT_MUTED }}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {post.commentCount} {isKorean ? "댓글" : "Comments"}
            </button>
            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold transition hover:bg-black/[0.04]"
              style={{ color: COMMUNITY_REDDIT_MUTED }}
            >
              <Share2 className="h-3.5 w-3.5" />
              {isKorean ? "공유" : "Share"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export type { CommunityCategorySlug };
