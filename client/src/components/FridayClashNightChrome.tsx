import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/**
 * Unmistakable Violet night chrome for Friday Clash Night (W5).
 * When inactive, renders children only — no permanent Violet overload.
 * Shows B (pool weight) + C (win bonus) differentiation badges when night is on.
 */
export function FridayClashNightChrome({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  if (!active) return <>{children}</>;

  return (
    <div
      className="nex-clash-night-shell"
      data-testid="friday-clash-night"
      data-clash-night="on"
      aria-label={t("battle.clashNightAria")}
    >
      <div
        className="nex-clash-night-banner"
        data-testid="friday-clash-banner"
        role="status"
        aria-live="polite"
        aria-label={t("battle.clashNightAria")}
      >
        <span className="nex-clash-night-banner-kicker">{t("battle.clashNightKicker")}</span>
        <span className="nex-clash-night-banner-title">{t("battle.clashNightTitle")}</span>
        <span className="nex-clash-night-banner-sub">{t("battle.clashNightSub")}</span>
        <div className="nex-clash-night-badges" data-testid="friday-clash-badges">
          <span className="nex-clash-night-badge">{t("battle.clashNightPoolBadge")}</span>
          <span className="nex-clash-night-badge nex-clash-night-badge--bonus">
            {t("battle.clashNightBonusBadge")}
          </span>
        </div>
      </div>
      <div className="nex-clash-night-frame">{children}</div>
    </div>
  );
}
