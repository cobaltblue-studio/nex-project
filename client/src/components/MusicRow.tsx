import { useState } from "react";
import { motion } from "framer-motion";
import { Play, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

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
      window.location.href = "/api/login";
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
          <h3 className="text-sm font-bold text-white uppercase tracking-wider truncate cursor-pointer hover:text-primary transition-colors">
            {track.title}
          </h3>
        </Link>
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-zinc-500">
          <span className="text-primary/70">
            {track.creatorName || "NEX CREATOR"}
          </span>
          <span className="px-1.5 py-0.5 bg-white/5 rounded-xs text-[8px] border border-white/10">
            {track.aiTool}
          </span>
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
