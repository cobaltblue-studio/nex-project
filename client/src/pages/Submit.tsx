import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useMe } from "@/hooks/use-profiles";
import { useCreateWork } from "@/hooks/use-works";
import { Loader2, UploadCloud, AlertCircle, Info } from "lucide-react";
import { clsx } from "clsx";

export function Submit() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useMe();
  const createWork = useCreateWork();

  const [formData, setFormData] = useState({
    title: "",
    prompt: "",
    aiTool: "Midjourney",
    modelVersion: "v6.0",
    workType: "image",
  });

  useEffect(() => {
    if (!authLoading && !profileLoading && !isAuthenticated) {
      navigate("/join");
    }
  }, [isAuthenticated, authLoading, profileLoading, navigate]);

  if (authLoading || profileLoading) return <div className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;

  if (!isAuthenticated) {
    return null;
  }

  if (!profile) {
    return (
      <div className="text-center py-32 border border-white/5 bg-white/5 rounded-sm">
        <AlertCircle className="w-12 h-12 text-primary mx-auto mb-6 opacity-40" />
        <h2 className="text-2xl font-display font-bold uppercase tracking-widest mb-4 neon-text-green">NEX PROFILE REQUIRED</h2>
        <p className="text-zinc-500 mb-10 text-xs uppercase tracking-[0.2em]">Initialize your presence before data transmission</p>
        <button onClick={() => navigate("/profile/me")} className="bg-primary text-black px-10 py-4 rounded-sm font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(0,240,255,0.3)]">
          Setup Profile
        </button>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createWork.mutate(formData, {
      onSuccess: () => navigate("/profile/me"),
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto py-8">
      <header className="mb-14 space-y-4">
        <div className="flex items-center gap-3 text-primary">
          <div className="w-8 h-px bg-primary/30" />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em]">NEX REPOSITORY SUBMISSION</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-display font-bold text-white tracking-tighter uppercase leading-none neon-text-green">Initialize<br />Evaluation</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-12">
        <section className="bg-[#0A0A0A] border border-white/5 p-8 md:p-12 rounded-sm relative overflow-hidden space-y-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Work Title</label>
              <input
                required
                type="text"
                className="w-full bg-black border border-white/10 rounded-sm px-4 py-4 text-white focus:outline-none focus:border-primary transition-all font-sans text-lg font-bold placeholder:text-zinc-800"
                placeholder="E.G. CYBERNETIC DREAMS"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Neural Prompt (Metadata)</label>
              <textarea
                required
                rows={6}
                className="w-full bg-black border border-white/10 rounded-sm px-4 py-4 text-white focus:outline-none focus:border-primary transition-all resize-none font-mono text-sm placeholder:text-zinc-800"
                placeholder="Paste the exact prompt used for evaluation..."
                value={formData.prompt}
                onChange={e => setFormData({ ...formData, prompt: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">AI Architecture</label>
              <select
                className="w-full bg-black border border-white/10 rounded-sm px-4 py-4 text-white focus:outline-none focus:border-primary transition-all appearance-none font-bold uppercase tracking-widest text-xs"
                value={formData.aiTool}
                onChange={e => setFormData({ ...formData, aiTool: e.target.value })}
              >
                <option value="Midjourney">Midjourney</option>
                <option value="Suno">Suno AI</option>
                <option value="Runway">Runway Gen-2</option>
                <option value="Claude">Claude</option>
                <option value="ChatGPT">ChatGPT</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Version Sync</label>
              <input
                required
                type="text"
                className="w-full bg-black border border-white/10 rounded-sm px-4 py-4 text-white focus:outline-none focus:border-primary transition-all font-mono text-xs uppercase"
                placeholder="E.G. V6.0"
                value={formData.modelVersion}
                onChange={e => setFormData({ ...formData, modelVersion: e.target.value })}
              />
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Classification</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { id: 'image', label: 'Image' },
              { id: 'music', label: 'Audio' },
              { id: 'vertical_video', label: 'Vertical' },
              { id: 'music_video', label: 'Cinema' }
            ].map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => setFormData({ ...formData, workType: type.id })}
                className={clsx(
                  "py-4 px-4 rounded-sm text-[10px] font-bold uppercase tracking-[0.2em] border transition-all duration-300",
                  formData.workType === type.id 
                    ? "bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(0,240,255,0.1)]" 
                    : "bg-transparent border-white/5 text-zinc-600 hover:text-white hover:border-white/20"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
        </section>

        <div className="flex items-start gap-4 p-6 bg-blue-500/5 border border-blue-500/10 rounded-sm">
          <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-blue-400/80 leading-relaxed uppercase tracking-widest">
            AI Craft Engine will evaluate Engagement, Quality, Depth, and Velocity.
            Initial score will be generated upon transmission.
          </p>
        </div>

        <button
          type="submit"
          disabled={createWork.isPending}
          className="w-full bg-primary text-black font-display font-bold text-xl uppercase tracking-widest py-6 rounded-sm hover:brightness-110 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(0,240,255,0.4)] relative group"
        >
          {createWork.isPending ? "Transmitting..." : "Initialize Neural Link"}
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-10 transition-opacity" />
        </button>
      </form>
    </motion.div>
  );
}
