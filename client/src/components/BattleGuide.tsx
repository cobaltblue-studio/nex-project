import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Shield, Swords, Trophy, Sparkles } from "lucide-react";

const cobalt = {
  text: "hsl(215, 95%, 72%)",
  textMuted: "hsl(215, 25%, 58%)",
  iconBg: "hsla(220, 85%, 50%, 0.12)",
};

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.5, ease: "easeOut" },
};

function WeightBar({
  segments,
}: {
  segments: readonly { label: string; pct: number }[];
}) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-black/50 ring-1 ring-white/[0.06]">
      {segments.map((s, i) => (
        <div
          key={`${s.label}-${s.pct}`}
          className={`h-full ${i === 0 ? "rounded-l-full" : ""} ${i === segments.length - 1 ? "rounded-r-full" : ""}`}
          style={{
            width: `${s.pct}%`,
            background:
              i === 0
                ? "linear-gradient(90deg, hsl(225,85%,42%), hsl(215,90%,50%))"
                : i === 1
                  ? "linear-gradient(90deg, hsl(210,85%,48%), hsl(200,88%,52%))"
                  : i === 2
                    ? "linear-gradient(90deg, hsl(200,80%,50%), hsl(190,85%,52%))"
                    : "linear-gradient(90deg, hsl(195,75%,52%), hsl(185,80%,55%))",
          }}
          title={`${s.label} ${s.pct}%`}
        />
      ))}
    </div>
  );
}

export function BattleGuide() {
  const { t } = useTranslation();

  const cards = useMemo(() => {
    const submissionPoints = t("battleGuide.submission.points", { returnObjects: true }) as string[];
    const battlePoints = t("battleGuide.battleCard.points", { returnObjects: true }) as string[];
    const hallPoints = t("battleGuide.hall.points", { returnObjects: true }) as string[];
    const weights = [
      { label: t("battleGuide.metrics.battle"), pct: 50 },
      { label: t("battleGuide.metrics.like"), pct: 20 },
      { label: t("battleGuide.metrics.play"), pct: 20 },
      { label: t("battleGuide.metrics.fans"), pct: 10 },
    ];
    return [
      {
        icon: Shield,
        badge: t("battleGuide.badges.submission"),
        headline: t("battleGuide.submission.headline"),
        tagline: t("battleGuide.submission.tagline"),
        points: submissionPoints,
      },
      {
        icon: Swords,
        badge: t("battleGuide.badges.battle"),
        headline: t("battleGuide.battleCard.headline"),
        tagline: t("battleGuide.battleCard.tagline"),
        weights,
        points: battlePoints,
      },
      {
        icon: Trophy,
        badge: t("battleGuide.badges.hallOfFame"),
        headline: t("battleGuide.hall.headline"),
        tagline: t("battleGuide.hall.tagline"),
        points: hallPoints,
      },
    ] as const;
  }, [t]);

  return (
    <motion.section
      className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 pt-2 pb-10 md:pb-12 z-20"
      data-testid="section-battle-guide"
      {...fadeUp}
    >
      <div className="mb-6 md:mb-8 text-center space-y-2">
        <p
          className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.35em]"
          style={{ color: cobalt.textMuted }}
        >
          {t("battleGuide.eyebrow")}
        </p>
        <h2 className="text-lg sm:text-xl md:text-2xl font-display font-bold tracking-tight uppercase">
          <span className="text-white">{t("battleGuide.titleBefore")}</span>{" "}
          <span style={{ color: cobalt.text }} className="normal-case">
            {t("battleGuide.titleHighlight")}
          </span>{" "}
          <span className="text-white">{t("battleGuide.titleAfter")}</span>
        </h2>
        <p className="text-[11px] sm:text-xs text-zinc-500 max-w-lg mx-auto leading-relaxed normal-case font-light">
          {t("battleGuide.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.article
              key={card.badge}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: "easeOut" }}
              className="group relative flex flex-col rounded-2xl border border-[hsla(220,88%,48%,0.32)] bg-[hsla(230,18%,6%,0.92)] p-5 sm:p-6 backdrop-blur-md shadow-[0_0_0_1px_hsla(220,90%,50%,0.08)_inset,0_4px_24px_rgba(0,0,0,0.35)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[hsla(220,88%,55%,0.5)] hover:shadow-[0_0_0_1px_hsla(220,90%,52%,0.18)_inset,0_20px_50px_-12px_rgba(37,99,235,0.2),0_20px_50px_-12px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsla(220,88%,48%,0.35)] transition-colors duration-300 group-hover:border-[hsla(220,88%,55%,0.5)]"
                  style={{
                    background: cobalt.iconBg,
                    color: cobalt.text,
                  }}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 text-left pt-0.5">
                  <p className="text-[8px] font-black uppercase tracking-[0.28em] text-zinc-500 mb-1">
                    {card.badge}
                  </p>
                  <h3 className="text-sm font-display font-bold text-white leading-snug tracking-wide uppercase">
                    {card.headline}
                  </h3>
                </div>
              </div>

              <p
                className="text-[12px] sm:text-[13px] leading-snug font-medium mb-4 normal-case"
                style={{ color: cobalt.text }}
              >
                {card.tagline}
              </p>

              {"weights" in card && card.weights ? (
                <div className="mb-4 space-y-2">
                  <WeightBar segments={card.weights} />
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                    {card.weights.map((w) => (
                      <span key={`${w.label}-${w.pct}`} className="tabular-nums">
                        {w.label}{" "}
                        <span style={{ color: cobalt.text }}>{w.pct}%</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <ul className="mt-auto space-y-2.5 text-left border-t border-white/[0.06] pt-4">
                {card.points.map((line, pi) => (
                  <li
                    key={pi}
                    className="flex gap-2 text-[11px] sm:text-[12px] text-zinc-400 leading-relaxed normal-case"
                  >
                    <Sparkles
                      className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-60"
                      style={{ color: cobalt.text }}
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </motion.article>
          );
        })}
      </div>
    </motion.section>
  );
}
