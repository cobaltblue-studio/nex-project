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
        "inline-flex shrink-0 items-center rounded-xs border border-primary/40 bg-primary/10 font-bold uppercase text-primary",
        compact
          ? "px-1 py-px text-[6px] tracking-[0.18em]"
          : "px-1.5 py-0.5 text-[8px] tracking-[0.22em]",
        className,
      )}
      data-testid={testId}
    >
      {t("new.badge")}
    </span>
  );
}
