import { BadgeCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
  className?: string;
};

/** Creator card: light cyan pill + filled rosette-check + “Verified”. */
export function VerifiedPillBadge({ className = "" }: Props) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full bg-primary/12 border border-primary/25 px-1.5 py-[2px] shrink-0 ${className}`}
      data-testid="badge-verified-pill"
    >
      <BadgeCheck
        className="w-3 h-3 text-primary fill-primary stroke-primary shrink-0"
        strokeWidth={1.75}
        aria-hidden
      />
      <span className="text-[8px] font-semibold text-primary leading-none normal-case tracking-normal">
        {t("creators.verifiedLabel")}
      </span>
    </span>
  );
}
