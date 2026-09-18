import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

export const CLASH_INTENT_IDS = ["hook", "mood", "voice", "craft"] as const;
export type ClashIntentId = (typeof CLASH_INTENT_IDS)[number];

export const INTENT_STORAGE_KEY = "nex.battle.lastIntent";

export function isClashIntentId(value: string | null | undefined): value is ClashIntentId {
  return !!value && (CLASH_INTENT_IDS as readonly string[]).includes(value);
}

export function readLastClashIntent(): ClashIntentId | null {
  try {
    const raw = window.localStorage.getItem(INTENT_STORAGE_KEY);
    return isClashIntentId(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeLastClashIntent(id: ClashIntentId) {
  try {
    window.localStorage.setItem(INTENT_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

type IntentDuelChipsProps = {
  value: ClashIntentId | null;
  onChange?: (id: ClashIntentId) => void;
  /** After vote: Teal confirm lead; before: Violet clash lead */
  confirmed?: boolean;
  disabled?: boolean;
  className?: string;
};

/**
 * Light Intent Duel — clash-call chips (why this pick).
 * Violet before confirm · Teal check after vote. Local-only.
 */
export function IntentDuelChips({
  value,
  onChange,
  confirmed = false,
  disabled = false,
  className = "",
}: IntentDuelChipsProps) {
  const { t } = useTranslation();
  const locked = disabled || confirmed || !onChange;

  return (
    <div
      className={`nex-intent-duel ${className}`}
      role="group"
      aria-label={t("battle.intentLabel")}
      data-testid="intent-duel-chips"
      data-confirmed={confirmed ? "true" : "false"}
    >
      <p className="nex-intent-duel-label">{t("battle.intentLabel")}</p>
      <div className="nex-intent-duel-row">
        {CLASH_INTENT_IDS.map((id) => {
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              disabled={locked}
              aria-pressed={selected}
              data-testid={`intent-chip-${id}`}
              data-selected={selected ? "true" : "false"}
              className={[
                "nex-intent-chip",
                selected && !confirmed ? "nex-intent-chip--picked" : "",
                selected && confirmed ? "nex-intent-chip--confirmed" : "",
                confirmed && !selected ? "nex-intent-chip--dim" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                if (locked || !onChange) return;
                onChange(id);
                writeLastClashIntent(id);
              }}
            >
              {selected && confirmed ? (
                <Check className="nex-intent-chip-check" aria-hidden />
              ) : null}
              <span>{t(`battle.intent.${id}`)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
