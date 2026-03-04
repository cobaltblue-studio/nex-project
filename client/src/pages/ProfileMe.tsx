import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useMe, useCreateProfile } from "@/hooks/use-profiles";
import { useWorks } from "@/hooks/use-works";
import { Loader2, Settings, Target, Zap, TrendingUp, Layers } from "lucide-react";
import { LeagueBadge } from "@/components/LeagueBadge";
import { WorkCard } from "@/components/WorkCard";

export function ProfileMe() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useMe();
  const createProfile = useCreateProfile();
  
  const [formData, setFormData] = useState({
    username: "",
    bio: "",
  });

  const { data: works, isLoading: worksLoading } = useWorks(undefined, profile?.id?.toString());

  if (authLoading || profileLoading) return <div className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;

  if (!isAuthenticated) {
    return (
      <div className="text-center py-32 space-y-6">
        <h2 className="text-4xl font-display font-bold uppercase tracking-widest">NEX ACCESS DENIED</h2>
        <p className="text-zinc-500 max-w-xs mx-auto text-sm uppercase tracking-widest">Establish a neural link to view profile data</p>
        <a href="/api/login" className="inline-block bg-primary text-black px-10 py-4 rounded-sm font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(0,240,255,0.3)]">Connect</a>
      </div>
    );
  }

  // Setup Profile Screen
  if (!profile) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto py-12">
        <div className="bg-[#0A0A0A] p-10 rounded-sm border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_10px_rgba(0,240,255,1)]" />
          
          <h2 className="text-3xl font-display font-bold uppercase tracking-tighter mb-2">INITIALIZE NEX</h2>
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-10">Define your presence in the NEO architecture</p>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            createProfile.mutate(formData);
          }} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">NEX HANDLE</label>
              <input
                required
                type="text"
                className="w-full bg-black border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-primary transition-all font-mono"
                placeholder="cyber_creator_99"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">BIO-DATA</label>
              <textarea
                rows={3}
                className="w-full bg-black border border-white/10 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-primary transition-all resize-none font-mono"
                placeholder="Neural architecture enthusiast..."
                value={formData.bio}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>
            <button
              type="submit"
              disabled={createProfile.isPending}
              className="w-full bg-primary text-black font-bold uppercase tracking-widest py-4 rounded-sm hover:brightness-110 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(0,240,255,0.2)]"
            >
              {createProfile.isPending ? "Syncing..." : "Establish Identity"}
            </button>
          </form>
        </div>
      </motion.div>
    );
  }

  // Active Profile Screen
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-16">
      <header className="relative p-10 md:p-14 border border-white/5 bg-[#0A0A0A] rounded-sm">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
          <div className="w-32 h-32 rounded-sm border border-white/10 p-2 flex-shrink-0 relative group bg-black">
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-4xl text-primary font-display font-bold overflow-hidden">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt={profile.username} className="w-full h-full object-cover" />
              ) : (
                profile.username[0].toUpperCase()
              )}
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-6">
            <div className="space-y-2">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <h1 className="text-5xl md:text-6xl font-display font-bold text-white tracking-tighter uppercase leading-none">
                  {profile.username}
                </h1>
                <div className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest rounded-sm inline-block mx-auto md:mx-0">
                  {profile.league}
                </div>
              </div>
              <p className="text-zinc-500 text-sm md:text-base max-w-xl mx-auto md:mx-0 font-sans leading-relaxed italic">
                "{profile.bio || "No mission statement established."}"
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 pt-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Global Rank</p>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary/50" />
                  <p className="text-3xl font-display font-bold text-white leading-none">{profile.rank ? `#${profile.rank}` : "TBD"}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Craft Score</p>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
                  <p className="text-3xl font-display font-bold text-white leading-none neon-text">{profile.aiCraftScore}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Works</p>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-zinc-500" />
                  <p className="text-3xl font-display font-bold text-zinc-400 leading-none">{works?.length || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button className="absolute top-8 right-8 p-3 text-zinc-500 hover:text-white transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </header>

      <section className="space-y-8">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-primary animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
            <h2 className="text-xl font-display font-bold uppercase tracking-[0.2em] text-white">NEX REPOSITORY</h2>
          </div>
          <Link href="/submit" className="text-[10px] font-bold uppercase tracking-widest text-primary border border-primary/20 px-4 py-2 hover:bg-primary/5 transition-all">
            + New Work
          </Link>
        </div>
        
        {worksLoading ? (
          <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : works?.length === 0 ? (
          <div className="text-center py-32 border border-white/5 border-dashed bg-white/5">
            <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.3em]">No data found in repository</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {works?.map((work, idx) => (
              <WorkCard key={work.id} work={work} index={idx} />
            ))}
          </div>
        )}
      </section>
    </motion.div>
  );
}
