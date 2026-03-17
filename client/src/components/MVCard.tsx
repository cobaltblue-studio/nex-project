import { useState } from "react";
import { motion } from "framer-motion";
import { Youtube, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MVCardProps {
  track: any;
  index: number;
}

function getVotedTracks(): number[] {
  try { return JSON.parse(localStorage.getItem("nex_voted_tracks") || "[]"); } catch { return []; }
}
function markVoted(id: number) {
  const arr = getVotedTracks();
  if (!arr.includes(id)) localStorage.setItem("nex_voted_tracks", JSON.stringify([...arr, id]));
}

export function MVCard({ track, index }: MVCardProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [hasVoted, setHasVoted] = useState(() => getVotedTracks().includes(track.id));
  const [localVotes, setLocalVotes] = useState<number | null>(null);

  const displayVotes = localVotes !== null ? localVotes : track.votes;

  const voteMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/tracks/${track.id}/vote`),
    onMutate: () => {
      const prev = queryClient.getQueryData<any[]>(["/api/tracks"]);
      if (prev) {
        queryClient.setQueryData(["/api/tracks"], prev.map(t =>
          t.id === track.id ? { ...t, votes: t.votes + 1 } : t
        ));
      }
      setLocalVotes((localVotes ?? track.votes) + 1);
      setHasVoted(true);
      markVoted(track.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
    },
    onError: (err: any) => {
      const is409 = err?.message?.startsWith("409");
      if (is409) {
        setHasVoted(true);
        markVoted(track.id);
        toast({ title: "Already voted", description: "You've already voted for this track.", variant: "destructive" });
      } else {
        setLocalVotes(null);
        setHasVoted(false);
        queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
        toast({ title: "Vote failed", variant: "destructive" });
      }
    },
  });

  const handleVote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }
    if (hasVoted || voteMutation.isPending) return;
    voteMutation.mutate();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group relative"
    >
      <Link href={`/mv/${track.id}`}>
        <div className="bg-[#0A0A0A] border border-white/5 rounded-sm overflow-hidden transition-all duration-500 group-hover:border-primary/40 group-hover:shadow-[0_0_30px_rgba(0,240,255,0.1)]">
          <div className="aspect-video bg-zinc-900 relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="absolute top-2 right-2 z-30 px-1 py-0.5 bg-black/70 border border-primary/20 rounded-sm text-[7px] font-mono font-bold uppercase tracking-wider cursor-default backdrop-blur-sm" style={{ color: "#00FF80" }} data-testid={`badge-ai-dna-mv-${track.id}`}>
                  [AI_DNA]
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px] font-mono">
                [MODEL: NEX_LYRIA] [SEED: 7721] [STYLE: AI_SOUL]
              </TooltipContent>
            </Tooltip>
            <Youtube className="w-8 h-8 text-red-600/40 group-hover:text-red-600 group-hover:scale-110 transition-all z-20" />
            <div className="absolute bottom-2 left-2 right-2 z-20">
              <h3 className="text-[10px] font-bold text-white uppercase tracking-wider truncate">
                {track.title}
              </h3>
            </div>
          </div>

          <div className="p-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[8px] font-mono text-zinc-600 font-bold mb-0.5">NEX #{String(index + 1).padStart(3, "0")}</div>
              <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest text-zinc-500">
                <span className="text-primary/70">{track.creatorName || "NEX CREATOR"}</span>
                {track.winStreak > 0 && (
                  <span className="px-1 py-0.5 bg-orange-500/10 text-orange-400 rounded-xs text-[7px] border border-orange-500/20" data-testid={`text-streak-mv-${track.id}`}>
                    🔥 WIN STREAK: {track.winStreak}
                  </span>
                )}
              </div>
            </div>

            {/* Vote button */}
            <button
              onClick={handleVote}
              disabled={hasVoted || voteMutation.isPending}
              data-testid={`button-vote-mv-${track.id}`}
              className={`flex items-center gap-1 px-2 py-1 rounded-sm border text-[9px] font-bold uppercase tracking-wider transition-all ${
                hasVoted
                  ? "border-primary/40 bg-primary/10 text-primary cursor-default"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
              }`}
            >
              <ChevronUp className={`w-2.5 h-2.5 ${hasVoted ? "fill-primary text-primary" : ""}`} />
              <span data-testid={`text-votes-mv-${track.id}`}>{displayVotes}</span>
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
