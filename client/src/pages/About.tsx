export default function About() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-primary/60 mb-2">NEX Platform</p>
      <h1 className="text-2xl font-black uppercase tracking-[0.15em] text-white mb-8 neon-text-strong neon-text-green">About NEX</h1>

      <div className="space-y-6 text-[13px] text-zinc-400 leading-relaxed">
        <p>
          NEX is an AI music ranking platform dedicated to discovering and showcasing the best
          AI-generated music from around the world.
        </p>
        <p>
          Artists can submit their tracks, listeners can explore new sounds, and the community
          helps shape the future of AI music through battle voting and chart performance.
        </p>
        <p>
          Our goal is to build the most credible AI music chart, similar to how Billboard
          represents traditional music charts.
        </p>
        <p>
          Every track enters the system through submission and battle evaluation before
          reaching the official chart.
        </p>
      </div>
    </div>
  );
}
