import { useRoute } from "wouter";
import { motion } from "framer-motion";
import { useProfile } from "@/hooks/use-profiles";
import { useWorks } from "@/hooks/use-works";
import { Loader2, Target, ExternalLink } from "lucide-react";
import { LeagueBadge } from "@/components/LeagueBadge";
import { WorkCard } from "@/components/WorkCard";

export function ProfileDetail() {
  const [, params] = useRoute("/profile/:id");
  const profileId = params?.id;
  
  const { data: profile, isLoading: profileLoading } = useProfile(profileId || "");
  const { data: works, isLoading: worksLoading } = useWorks(undefined, profileId);

  if (profileLoading) return <div className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;

  if (!profile) {
    return <div className="p-20 text-center text-xl font-display uppercase">Profile Not Found</div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
      <header className="relative p-8 md:p-12 rounded-3xl border border-white/10 overflow-hidden glass-card">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-32 h-32 rounded-full border-2 border-primary/50 p-1 flex-shrink-0 relative">
            <div className="w-full h-full rounded-full bg-background flex items-center justify-center text-5xl text-primary font-display font-bold">
              {profile.username[0].toUpperCase()}
            </div>
            {profile.isVerified && (
              <div className="absolute -bottom-2 -right-2 bg-primary text-black p-1.5 rounded-full border-2 border-background">
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
            <p className="text-muted-foreground">No works submitted yet.</p>
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
