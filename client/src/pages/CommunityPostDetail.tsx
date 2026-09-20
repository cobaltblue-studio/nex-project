import { useRoute } from "wouter";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { CommunityPostPanel } from "@/components/CommunityPostPanel";
import { COMMUNITY_REDDIT_BG, COMMUNITY_REDDIT_INK, COMMUNITY_REDDIT_MUTED } from "@shared/community";

/** Standalone post page — main community UX uses in-feed popup on `/community`. */
export function CommunityPostDetail() {
  const { i18n } = useTranslation();
  const isKorean = i18n.language?.startsWith("ko");
  const [, params] = useRoute("/community/:id");
  const postId = Number(params?.id);

  const backLabel = useMemo(() => (isKorean ? "커뮤니티로 돌아가기" : "Back to community"), [isKorean]);

  if (!Number.isFinite(postId)) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-7rem)] px-4 pb-12 pt-2" style={{ backgroundColor: COMMUNITY_REDDIT_BG }}>
      <div className="mx-auto max-w-3xl">
        <Link
          href="/community"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold transition hover:opacity-80"
          style={{ color: COMMUNITY_REDDIT_MUTED }}
        >
          <ArrowLeft className="h-4 w-4" />
          <span style={{ color: COMMUNITY_REDDIT_INK }}>{backLabel}</span>
        </Link>
        <CommunityPostPanel postId={postId} layout="page" />
      </div>
    </div>
  );
}
