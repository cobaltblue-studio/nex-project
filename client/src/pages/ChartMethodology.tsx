export default function ChartMethodology() {
  const factors = [
    "Battle win rate",
    "Listener plays",
    "Community voting",
    "Recent activity boost",
  ];

  return (
    <div className="max-w-2xl mx-auto py-8">
      <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-primary/60 mb-2">NEX Platform</p>
      <h1 className="text-2xl font-black uppercase tracking-[0.15em] text-white mb-8">Chart Methodology</h1>

      <div className="space-y-6 text-[13px] text-zinc-400 leading-relaxed">
        <p>
          NEX rankings are determined through a combination of listener engagement and battle
          performance.
        </p>

        <div>
          <p className="text-white font-bold text-[11px] uppercase tracking-widest mb-3">
            Ranking factors include:
          </p>
          <ul className="space-y-2">
            {factors.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="text-primary mt-0.5 shrink-0">•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <p>
          Tracks enter the system through submission and admin verification.
        </p>
        <p>
          Approved tracks join the battle pool where they compete with other tracks in
          head-to-head battles.
        </p>
        <p>
          Winning tracks gain higher visibility and may enter the official NEX Chart.
        </p>
      </div>
    </div>
  );
}
