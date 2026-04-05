import { useState } from "react";
import { motion } from "framer-motion";
import { Play, ChevronUp } from "lucide-react";
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

interface MusicRowProps {
  track: any;
  rank: number;
}

function getVotedTracks(): number[] {
  try { return JSON.parse(localStorage.getItem("nex_voted_tracks") || "[]"); } catch { return []; }
}
function markVoted(id: number) {
  const arr = getVotedTracks();
  if (!arr.includes(id)) localStorage.setItem("nex_voted_tracks", JSON.stringify([...arr, id]));
}

export function MusicRow({ track, rank }: MusicRowProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [hasVoted, setHasVoted] = useState(() => getVotedTracks().includes(track.id));
  const [localVotes, setLocalVotes] = useState<number | null>(null);

  const displayVotes = localVotes !== null ? localVotes : track.votes;

  const voteMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/tracks/${track.id}/vote`),
    onMutate: () => {
      // Optimistic update in cache
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
        toast({ title: "Vote failed", description: "Could not submit vote. Try again.", variant: "destructive" });
      }
    },
  });

  const handleVote = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "You need to log in to vote.",
        variant: "destructive",
      });
      return;
    }
    if (hasVoted || voteMutation.isPending) return;
    voteMutation.mutate();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.02 }}
      className="group flex items-center gap-4 p-3 hover:bg-white/5 rounded-sm transition-all border-b border-white/5 last:border-0"
    >
      <div className="w-16 text-[10px] font-mono text-zinc-600 font-bold uppercase tracking-tighter">
        NEX #{String(rank).padStart(3, "0")}
      </div>

      <div className="flex-1 min-w-0">
        <Link href={`/track/${track.id}`}>
          <h3 className="text-[0.6rem] font-bold text-white uppercase tracking-wider truncate leading-tight cursor-pointer hover:text-primary transition-colors">
            {track.title}
          </h3>
        </Link>
        <div className="hidden md:flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-zinc-500 mt-1">
          <span className="text-primary/70">
            {track.creatorName || "unknown"}
          </span>
          <span className="px-1.5 py-0.5 bg-white/5 rounded-xs text-[8px] border border-white/10">
            {track.aiTool}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="px-1 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider cursor-default" style={{ color: "#00FF80" }} data-testid={`badge-ai-dna-${track.id}`}>[AI_DNA]</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="font-mono text-[10px] text-white" style={{ background: "rgba(0,0,0,0.9)", border: "1px solid rgba(0,255,128,0.4)" }}>
              {track.aiPrompt || "[RAW_DATA_SYNCED | SEED: 7721]"}
            </TooltipContent>
          </Tooltip>
          {track.winStreak > 0 && (
            <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded-xs text-[8px] border border-orange-500/20" data-testid={`text-streak-${track.id}`}>
              🔥 WIN STREAK: {track.winStreak}
            </span>
          )}
        </div>
        <div className="flex md:hidden flex-wrap items-center gap-1 mt-1 min-w-0">
          <span className="text-[8px] font-bold text-primary/70 uppercase tracking-widest truncate max-w-[80px]">
            {track.creatorName || "unknown"}
          </span>
          <span className="px-1 py-0.5 bg-white/5 rounded-xs text-[7px] border border-white/10 shrink-0">
            {track.aiTool}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="px-0.5 text-[6px] font-mono font-bold uppercase tracking-wider cursor-default shrink-0" style={{ color: "#00FF80" }} data-testid={`badge-ai-dna-mobile-${track.id}`}>[AI_DNA]</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="font-mono text-[10px] text-white" style={{ background: "rgba(0,0,0,0.9)", border: "1px solid rgba(0,255,128,0.4)" }}>
              {track.aiPrompt || "[RAW_DATA_SYNCED | SEED: 7721]"}
            </TooltipContent>
          </Tooltip>
          {track.winStreak > 0 && (
            <span className="px-1 py-0.5 bg-orange-500/10 text-orange-400 rounded-xs text-[6px] border border-orange-500/20 shrink-0" data-testid={`text-streak-mobile-${track.id}`}>
              🔥 {track.winStreak}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Vote button */}
        <button
          onClick={handleVote}
          disabled={hasVoted || voteMutation.isPending}
          data-testid={`button-vote-${track.id}`}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-[10px] font-bold uppercase tracking-widest transition-all ${
            hasVoted
              ? "border-primary/40 bg-primary/10 text-primary cursor-default"
              : "border-white/10 bg-white/5 text-zinc-400 hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
          }`}
        >
          <ChevronUp className={`w-3 h-3 ${hasVoted ? "fill-primary text-primary" : ""}`} />
          <span data-testid={`text-votes-${track.id}`}>{displayVotes}</span>
        </button>

        <Link href={`/track/${track.id}`}>
          <button className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-sm hover:bg-primary hover:text-black hover:border-primary transition-all">
            <Play className="w-3.5 h-3.5 fill-current" />
          </button>
        </Link>
      </div>
    </motion.div>
  );
}
