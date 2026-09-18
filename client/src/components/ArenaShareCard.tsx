import { Check } from "lucide-react";
import { ShareButtons } from "@/components/ShareButtons";
import type { ClashIntentId } from "@/components/IntentDuelChips";
import { useTranslation } from "react-i18next";

type ArenaShareCardProps = {
  title: string;
  creator: string;
  shareUrl: string;
  shareText: string;
  intent?: ClashIntentId | null;
  /** Gate handoff motion until verdict ritual finishes */
  handoffReady?: boolean;
  className?: string;
};

/**
 * Share Card v1 — navy canvas + Teal accent bar + Ember Share CTA.
 * Preview surface only; one-tap share via ShareButtons.
 */
export function ArenaShareCard({
  title,
  creator,
  shareUrl,
  shareText,
  intent = null,
  handoffReady = true,
  className = "",
}: ArenaShareCardProps) {
  const { t } = useTranslation();

  return (
    <div
      className={[
        "nex-arena-share-card",
        handoffReady ? "nex-share-handoff-anim" : "nex-arena-share-card--waiting",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid="arena-share-card"
      data-handoff={handoffReady ? "ready" : "waiting"}
    >
      <div className="nex-arena-share-bar" aria-hidden />
      <p className="nex-arena-share-eyebrow">{t("battle.shareCardEyebrow")}</p>
      <p className="nex-arena-share-title">{title}</p>
      <p className="nex-arena-share-creator">
        {t("battle.shareCardBy", { creator })}
      </p>
      {intent ? (
        <p className="nex-arena-share-intent" data-testid="arena-share-intent">
          <Check className="nex-arena-share-intent-check" aria-hidden />
          <span>{t(`battle.intent.${intent}`)}</span>
        </p>
      ) : null}
      <div className="nex-arena-share-actions">
        <ShareButtons
          url={shareUrl}
          text={shareText}
          variant="arena"
          testIdPrefix="battle-share"
        />
      </div>
    </div>
  );
}
