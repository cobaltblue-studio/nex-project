import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useMe, useCreateProfile } from "@/hooks/use-profiles";
import { useWorks } from "@/hooks/use-works";
import { Loader2, Settings, Target } from "lucide-react";
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
      <div className="text-center py-20">
        <h2 className="text-3xl font-display font-bold uppercase mb-4">Access Denied</h2>
        <a href="/api/login" className="bg-primary text-black px-6 py-3 rounded-xl font-bold uppercase">Login</a>
      </div>
    );
  }

  // Setup Profile Screen
  if (!profile) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto py-10">
        <div className="glass-card p-8 rounded-3xl border border-primary/30 neon-border">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-background rounded-full border-2 border-primary overflow-hidden">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary text-2xl font-display">{user?.firstName?.[0] || 'X'}</div>
              )}
            </div>
          </div>
          
          <h2 className="text-3xl font-display font-bold text-center uppercase mb-2">Initialize NEX</h2>
          <p className="text-muted-foreground text-center text-sm mb-8">Establish your creator identity on NEO.</p>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            createProfile.mutate(formData);
          }} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-primary">NEX Handle</label>
              <input
                required
                type="text"
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all"
                placeholder="cyber_creator_99"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-primary">Bio</label>
              <textarea
                rows={3}
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all resize-none"
                placeholder="What defines your craft?"
                value={formData.bio}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>
            <button
              type="submit"
              disabled={createProfile.isPending}
              className="w-full bg-primary text-black font-bold uppercase tracking-widest py-3.5 rounded-xl hover:bg-white transition-all disabled:opacity-50"
            >
              {createProfile.isPending ? "Creating..." : "Establish Identity"}
            </button>
          </form>
        </div>
      </motion.div>
    );
  }

  // Active Profile Screen
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
      <header className="relative p-8 md:p-12 rounded-3xl border border-white/10 overflow-hidden glass-card">
        {/* Background effects */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/20 blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-32 h-32 rounded-full border-2 border-primary/50 p-1 flex-shrink-0 relative group">
            <div className="w-full h-full rounded-full overflow-hidden bg-background">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt={profile.username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl text-primary font-display font-bold">
                  {profile.username[0].toUpperCase()}
                </div>
              )}
            </div>
            {profile.isVerified && (
              <div className="absolute -bottom-2 -right-2 bg-primary text-black p-1.5 rounded-full border-2 border-background shadow-[0_0_10px_rgba(0,240,255,0.8)]">
                <Target className="w-4 h-4" />
              </div>
            )}
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
              <h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-wider uppercase">
                {profile.username}
              </h1>
              <LeagueBadge league={profile.league} className="mx-auto md:mx-0" />
            </div>
            <p className="text-muted-foreground text-lg mb-6 max-w-2xl mx-auto md:mx-0">
              {profile.bio || "No bio established."}
            </p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Global Rank</p>
                <p className="text-3xl font-display font-bold text-white">{profile.rank ? `#${profile.rank}` : "TBD"}</p>
              </div>
              <div className="w-px h-12 bg-white/10 hidden md:block" />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Avg Craft Score</p>
                <p className="text-3xl font-display font-bold text-white neon-text">{profile.aiCraftScore}</p>
              </div>
            </div>
          </div>
          
          <button className="md:absolute top-8 right-8 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-muted-foreground hover:text-white">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div>
        <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
          <h2 className="text-2xl font-display font-bold uppercase tracking-widest">Portfolio</h2>
          <span className="text-sm font-mono text-muted-foreground">[{works?.length || 0} Entries]</span>
        </div>
        
        {worksLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : works?.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-2xl border-dashed">
            <p className="text-muted-foreground mb-4">No works submitted yet.</p>
            <a href="/submit" className="text-primary font-bold uppercase tracking-widest hover:underline">Submit First Work</a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {works?.map((work, idx) => (
              <WorkCard key={work.id} work={work} index={idx} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
