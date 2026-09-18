import { ShareButtons } from "@/components/ShareButtons";
import {
  resolveCreatorCrest,
  type CrestInputs,
  type CrestTierId,
} from "@/lib/creatorCrest";
import { useTranslation } from "react-i18next";

type Mode = "full" | "compact";

type Props = {
  inputs: CrestInputs;
  mode?: Mode;
  /** Profile share URL — enables Ember Share crest CTA when earned */
  shareUrl?: string;
  shareText?: string;
  className?: string;
  testId?: string;
};

function tierLabelKey(tier: CrestTierId): string {
  return `crest.tier.${tier}`;
}

/**
 * Creator Crest — Violet resting aura; Teal earn stamp when tier unlocked.
 * Full = profile panel; compact = chart/directory capsule (must stay visible).
 */
export function CreatorCrest({
  inputs,
  mode = "full",
  shareUrl,
  shareText,
  className = "",
  testId = "creator-crest",
}: Props) {
  const { t } = useTranslation();
  const crest = resolveCreatorCrest(inputs);
  const earned = crest.earned && crest.tier != null;

  if (mode === "compact") {
    const compactLabel = earned
      ? t("crest.earnedTitle", { tier: t(tierLabelKey(crest.tier!)) })
      : t("crest.restingTitle");
    return (
      <span
        className={[
          "nex-creator-crest-compact",
          earned ? "nex-creator-crest-compact--earned" : "nex-creator-crest-compact--resting",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        data-testid={testId}
        data-tier={crest.tier ?? "none"}
        role="img"
        aria-label={compactLabel}
        title={compactLabel}
      >
        <span className="nex-creator-crest-compact-mark" aria-hidden>
          ◈
        </span>
        <span className="nex-creator-crest-compact-label">
          {earned ? t(tierLabelKey(crest.tier!)) : t("crest.restingShort")}
        </span>
      </span>
    );
  }

  return (
    <section
      className={[
        "nex-creator-crest",
        earned ? "nex-creator-crest--earned" : "nex-creator-crest--resting",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid={testId}
      data-tier={crest.tier ?? "none"}
      aria-label={
        earned
          ? t("crest.earnedTitle", { tier: t(tierLabelKey(crest.tier!)) })
          : t("crest.restingTitle")
      }
    >
      <div className="nex-creator-crest-aura" aria-hidden />
      <div className="nex-creator-crest-body">
        <p className="nex-creator-crest-eyebrow">{t("crest.eyebrow")}</p>
        <div className="nex-creator-crest-row">
          <div
            className={[
              "nex-creator-crest-medal",
              earned ? "nex-creator-crest-medal--earned" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden
          >
            <span className="nex-creator-crest-medal-glyph">◈</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="nex-creator-crest-title">
              {earned ? t(tierLabelKey(crest.tier!)) : t("crest.restingTitle")}
            </p>
            <p className="nex-creator-crest-sub">
              {earned
                ? t("crest.earnedSub", { tier: t(tierLabelKey(crest.tier!)) })
                : t("crest.restingSub")}
            </p>
            {earned ? (
              <p
                className="nex-creator-crest-stamp"
                data-testid={`${testId}-stamp`}
              >
                {t("crest.stamp")}
              </p>
            ) : null}
          </div>
        </div>
        <p className="nex-creator-crest-meta" data-testid={`${testId}-meta`}>
          {t("crest.meta", {
            wins: crest.battleWins,
            streak: crest.maxWinStreak,
            rank: crest.bestChartRank != null ? `#${crest.bestChartRank}` : "—",
          })}
        </p>
        {earned && shareUrl ? (
          <div className="nex-creator-crest-share" data-testid={`${testId}-share`}>
            <ShareButtons
              url={shareUrl}
              text={shareText || t("crest.shareDefault", { tier: t(tierLabelKey(crest.tier!)) })}
              variant="arena"
              compact
              testIdPrefix="crest-share"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
