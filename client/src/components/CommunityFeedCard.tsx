import { Heart, MessageSquare, Pin, Share2 } from "lucide-react";
import { Link } from "wouter";
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_IVORY,
  COMMUNITY_IVORY_INK,
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

function excerpt(body: string, max = 160) {
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
  const trackHref = post.attachedTrack
    ? post.attachedTrack.trackType === "video"
      ? `/mv/${post.attachedTrack.id}`
      : `/track/${post.attachedTrack.id}`
    : null;

  return (
    <article
      className="rounded-2xl border border-stone-300/70 p-4 shadow-sm md:p-5"
      style={{ backgroundColor: COMMUNITY_IVORY, color: COMMUNITY_IVORY_INK }}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
        <span className="font-semibold text-stone-900">{post.authorName || "NEX"}</span>
        <span>·</span>
        <span>{formatTime(post.createdAt, isKorean)}</span>
        {post.pinnedAt ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            <Pin className="h-3 w-3" />
            Pin
          </span>
        ) : null}
        <span className="rounded-full bg-stone-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-700">
          {kindLabel}
        </span>
        {categoryLabel ? (
          <span className="rounded-full bg-stone-200/50 px-2 py-0.5 text-[10px] text-stone-600">{categoryLabel}</span>
        ) : null}
      </div>

      <button type="button" onClick={onOpen} className="mt-2 w-full text-left">
        <h3 className="text-base font-bold leading-snug text-stone-900 md:text-lg">{post.title}</h3>
        <p className="mt-2 text-sm leading-6 text-stone-700">{excerpt(post.body)}</p>
      </button>

      {post.attachedTrack && trackHref ? (
        <Link
          href={trackHref}
          className="mt-3 flex items-center gap-3 rounded-xl border border-stone-300/80 bg-white/50 px-3 py-2 text-sm text-stone-800 transition hover:bg-white"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-900 text-xs font-bold text-[#F7F1E3]">
            ▶
          </span>
          <span className="min-w-0 flex-1 truncate font-medium">{post.attachedTrack.title}</span>
        </Link>
      ) : null}

      <div className="mt-3 flex items-center gap-1 border-t border-stone-300/60 pt-3">
        <button
          type="button"
          onClick={onLike}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            post.viewerHasLiked ? "bg-rose-100 text-rose-700" : "text-stone-600 hover:bg-stone-200/70"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${post.viewerHasLiked ? "fill-current" : ""}`} />
          {post.likeCount}
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-200/70"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {post.commentCount}
        </button>
        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-200/70"
        >
          <Share2 className="h-3.5 w-3.5" />
          {isKorean ? "공유" : "Share"}
        </button>
      </div>
    </article>
  );
}

export type { CommunityCategorySlug };
