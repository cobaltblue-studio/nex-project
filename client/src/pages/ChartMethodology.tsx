import { Trophy, TrendingUp, Headphones, Zap } from "lucide-react";

export default function ChartMethodology() {
  const factors = [
    {
      icon: Trophy,
      title: "Battle Win Rate",
      description: "Tracks compete head-to-head in the battle arena. A higher win rate signals consistent quality and listener preference, heavily influencing chart position.",
      color: "text-yellow-400",
      bgColor: "bg-yellow-400/10",
      borderColor: "border-yellow-400/20",
    },
    {
      icon: TrendingUp,
      title: "Total Votes",
      description: "Community voting reflects broad listener support. Each unique vote adds weight to a track's ranking score, rewarding tracks that resonate with the audience.",
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/20",
    },
    {
      icon: Headphones,
      title: "Track Play Count",
      description: "Sustained listening activity demonstrates genuine engagement. Play counts are spam-protected — only verified, time-gated listens are counted.",
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
      borderColor: "border-blue-400/20",
    },
    {
      icon: Zap,
      title: "Recent Activity Boost",
      description: "Newly submitted tracks receive a temporary boost to ensure fresh music gets fair exposure. The boost decays over 72 hours, keeping the chart dynamic.",
      color: "text-green-400",
      bgColor: "bg-green-400/10",
      borderColor: "border-green-400/20",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-12">
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-primary/60 mb-2">NEX Platform</p>
        <h1 className="text-3xl md:text-4xl font-display font-bold uppercase tracking-[0.15em] text-white mb-4 neon-text-green" data-testid="text-methodology-title">
          Chart Methodology
        </h1>
        <p className="text-zinc-400 text-[13px] leading-relaxed">
          NEX rankings are determined through a transparent, multi-signal system that combines
          listener engagement and battle performance. No single metric can dominate — tracks must
          prove themselves across multiple dimensions to earn a chart position.
        </p>
      </div>

      <div className="space-y-4">
        <p className="text-white font-bold text-[11px] uppercase tracking-widest mb-4">
          Ranking Factors
        </p>

        <div className="grid gap-4">
          {factors.map((f) => (
            <div
              key={f.title}
              className={`border ${f.borderColor} ${f.bgColor} rounded-sm p-6 space-y-3`}
              data-testid={`card-factor-${f.title.toLowerCase().replace(/\s/g, "-")}`}
            >
              <div className="flex items-center gap-3">
                <f.icon className={`w-5 h-5 ${f.color}`} />
                <h3 className={`text-sm font-bold uppercase tracking-widest ${f.color}`}>
                  {f.title}
                </h3>
              </div>
              <p className="text-zinc-400 text-[13px] leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6 text-[13px] text-zinc-400 leading-relaxed">
        <div className="border-t border-white/5 pt-8">
          <h3 className="text-white font-bold text-[11px] uppercase tracking-widest mb-4">
            How It Works
          </h3>
          <p>
            Tracks enter the system through submission and admin verification.
            Approved tracks join the battle pool where they compete with other tracks in
            head-to-head battles.
          </p>
        </div>

        <p>
          The ranking score combines all four factors into a single composite value.
          Winning battles, accumulating votes, and generating play counts all contribute
          to a track's position on the chart.
        </p>

        <p>
          Tracks that achieve a strong win rate over at least 10 battles are automatically
          promoted to the official NEX Chart, where they compete for Top 100 placement.
        </p>
      </div>

      <div className="border border-primary/20 bg-primary/5 rounded-sm p-8 text-center">
        <p className="text-primary font-bold text-sm uppercase tracking-widest" data-testid="text-methodology-closing">
          Only the strongest tracks rise through the system and reach the official NEX charts.
        </p>
      </div>
    </div>
  );
}
