import { useRoute } from "wouter";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { CommunityPostPanel } from "@/components/CommunityPostPanel";

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
    <div className="mx-auto max-w-3xl pb-12">
      <Link href="/community" className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>
      <CommunityPostPanel postId={postId} layout="page" />
    </div>
  );
}
