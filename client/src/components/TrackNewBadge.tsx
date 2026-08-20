import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { isTrackNewBadgeVisible } from "@/lib/trackNewBadge";

export function TrackNewBadge({
  createdAt,
  compact = false,
  className,
  testId,
}: {
  createdAt?: string | Date | null;
  compact?: boolean;
  className?: string;
  testId?: string;
}) {
  const { t } = useTranslation();
  if (!isTrackNewBadgeVisible(createdAt)) return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm border font-bold uppercase leading-none text-primary shadow-[0_0_10px_rgba(0,209,255,0.25)]",
        "border-primary/70 bg-primary/20",
        compact
          ? "px-1.5 py-0.5 text-[9px] tracking-[0.14em]"
          : "px-2 py-0.5 text-[10px] tracking-[0.16em]",
        className,
      )}
      data-testid={testId}
      aria-label={t("new.badge")}
    >
      {t("new.badge")}
    </span>
  );
}
