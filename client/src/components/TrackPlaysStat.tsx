import { hasPublicCount } from "@/lib/displayStats";
import { useTranslation } from "react-i18next";

type Props = {
  playCount?: number | null;
  className?: string;
  testId?: string;
};

/** Chart/list plays column — hidden when count is 0. */
export function TrackPlaysStat({ playCount, className = "", testId }: Props) {
  const { t } = useTranslation();
  if (!hasPublicCount(playCount)) return null;
  return (
    <div className={`hidden sm:flex flex-col items-end text-right min-w-[56px] ${className}`}>
      <p className="text-xs sm:text-sm font-bold text-zinc-300" data-testid={testId}>
        {Number(playCount).toLocaleString()}
      </p>
      <p className="text-[8px] uppercase tracking-widest text-zinc-600 mt-0.5">{t("common.plays")}</p>
    </div>
  );
}
