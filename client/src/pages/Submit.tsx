import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useMe } from "@/hooks/use-profiles";
import { useCreateWork } from "@/hooks/use-works";
import { Loader2, UploadCloud, AlertCircle } from "lucide-react";
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

  if (authLoading || profileLoading) return <div className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;

  if (!isAuthenticated) {
    navigate("/join");
    return null;
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-16 h-16 text-primary mx-auto mb-6 opacity-50" />
        <h2 className="text-2xl font-bold font-display uppercase mb-4">Profile Required</h2>
        <p className="text-muted-foreground mb-8">You must setup your NEX profile before submitting works.</p>
        <button onClick={() => navigate("/profile/me")} className="bg-primary text-black px-6 py-3 rounded-xl font-bold uppercase tracking-widest hover:scale-105 transition-all">
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
      <header className="mb-10 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/30 neon-border">
          <UploadCloud className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-display font-bold text-white uppercase tracking-wider">Submit Work</h1>
        <p className="text-muted-foreground mt-2">Your work will be evaluated by the AI Craft Engine.</p>
      </header>

      <form onSubmit={handleSubmit} className="glass-card p-6 md:p-10 rounded-3xl space-y-6 relative overflow-hidden">
        
        {/* Fancy Background glow in form */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <label className="text-xs font-bold uppercase tracking-widest text-primary">Title</label>
          <input
            required
            type="text"
            className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            placeholder="E.g. Cybernetic Dreams"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div className="space-y-2 relative z-10">
          <label className="text-xs font-bold uppercase tracking-widest text-primary">Full Prompt</label>
          <textarea
            required
            rows={4}
            className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none font-mono text-sm"
            placeholder="Paste the exact prompt used..."
            value={formData.prompt}
            onChange={e => setFormData({ ...formData, prompt: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-primary">AI Tool</label>
            <select
              className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all appearance-none"
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
            <label className="text-xs font-bold uppercase tracking-widest text-primary">Model Version</label>
            <input
              required
              type="text"
              className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all"
              placeholder="E.g. v6.0 or Opus"
              value={formData.modelVersion}
              onChange={e => setFormData({ ...formData, modelVersion: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2 relative z-10">
          <label className="text-xs font-bold uppercase tracking-widest text-primary">Category</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: 'image', label: 'Image' },
              { id: 'music', label: 'Music' },
              { id: 'vertical_video', label: 'Vertical Video' },
              { id: 'music_video', label: 'Music Video' }
            ].map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => setFormData({ ...formData, workType: type.id })}
                className={clsx(
                  "py-3 px-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all duration-300",
                  formData.workType === type.id 
                    ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(0,240,255,0.2)]" 
                    : "bg-white/5 border-transparent text-muted-foreground hover:bg-white/10"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={createWork.isPending}
          className="w-full mt-8 bg-primary text-black font-display font-bold text-xl uppercase tracking-widest py-4 rounded-xl hover:bg-white hover:text-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:shadow-[0_0_30px_rgba(255,255,255,0.6)] relative z-10"
        >
          {createWork.isPending ? "Submitting..." : "Initialize Evaluation"}
        </button>
      </form>
    </motion.div>
  );
}
