import { ShareButtons } from "@/components/ShareButtons";
import type { CrestTierId } from "@/lib/creatorCrest";
import { useTranslation } from "react-i18next";

type CrestShareCardProps = {
  creatorName: string;
  tier: CrestTierId;
  shareUrl: string;
  shareText: string;
  metaLine?: string;
  className?: string;
};

/**
 * Crest Share v2 — navy canvas + Teal bar + tier proof + Ember Share CTAs.
 * Preview surface only (same path as ArenaShareCard v1).
 */
export function CrestShareCard({
  creatorName,
  tier,
  shareUrl,
  shareText,
  metaLine,
  className = "",
}: CrestShareCardProps) {
  const { t } = useTranslation();
  const tierLabel = t(`crest.tier.${tier}`);

  return (
    <div
      className={["nex-arena-share-card", "nex-crest-share-card", className]
        .filter(Boolean)
        .join(" ")}
      data-testid="crest-share-card"
      data-tier={tier}
    >
      <div className="nex-arena-share-bar" aria-hidden />
      <p className="nex-arena-share-eyebrow">{t("crest.shareCardEyebrow")}</p>
      <div className="nex-crest-share-medal" aria-hidden>
        <span>◈</span>
      </div>
      <p className="nex-arena-share-title">{tierLabel}</p>
      <p className="nex-arena-share-creator">
        {t("crest.shareCardBy", { creator: creatorName })}
      </p>
      {metaLine ? (
        <p className="nex-crest-share-meta" data-testid="crest-share-meta">
          {metaLine}
        </p>
      ) : null}
      <p className="nex-crest-share-stamp" data-testid="crest-share-stamp">
        {t("crest.stamp")}
      </p>
      <div className="nex-arena-share-actions">
        <ShareButtons
          url={shareUrl}
          text={shareText}
          variant="arena"
          testIdPrefix="crest-share"
        />
      </div>
    </div>
  );
}
