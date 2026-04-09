import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { KeyRound, Send } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

type Props = {
  trackId: number;
  claimableByCreators: boolean;
  /** Profile id of the current track owner (NEX profile row). */
  trackOwnerProfileId: number;
  /** Slightly tighter layout for dialogs */
  compact?: boolean;
};

/**
 * Lets an approved creator request ownership of a staff-seeded track, or claim with a staff code.
 * Same rules as the full track detail page.
 */
export function TrackClaimSection({
  trackId,
  claimableByCreators,
  trackOwnerProfileId,
  compact,
}: Props) {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [claimInfo, setClaimInfo] = useState("");
  const [claimSecret, setClaimSecret] = useState("");

  const { data: myProfile } = useQuery({
    queryKey: ["/api/profiles/me"],
    queryFn: async () => {
      const res = await fetch("/api/profiles/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json() as Promise<{ id: number } | null>;
    },
    enabled: isAuthenticated,
    retry: false,
  });

  const canClaimTrack =
    isAuthenticated &&
    user?.role === "creator" &&
    claimableByCreators &&
    myProfile?.id != null &&
    myProfile.id !== trackOwnerProfileId;

  const claimRequestMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/tracks/${trackId}/claim-request`, { claimInfo });
    },
    onSuccess: () => {
      setClaimInfo("");
      toast({ title: "Request sent", description: "An admin will review your ownership request." });
      void queryClient.invalidateQueries({ queryKey: [api.tracks.get.path, String(trackId)] });
      void queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
    },
    onError: (err: Error) => {
      toast({ title: "Could not submit", description: err.message, variant: "destructive" });
    },
  });

  const claimInstantMutation = useMutation({
    mutationFn: async (secret: string) => {
      await apiRequest("POST", `/api/tracks/${trackId}/claim-instant`, { secret });
    },
    onSuccess: () => {
      setClaimSecret("");
      toast({ title: "Track claimed", description: "This track is now linked to your creator account." });
      void queryClient.invalidateQueries({ queryKey: [api.tracks.get.path, String(trackId)] });
      void queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/tracks/my"] });
    },
    onError: (err: Error) => {
      toast({ title: "Claim failed", description: err.message, variant: "destructive" });
    },
  });

  if (!canClaimTrack) return null;

  const pad = compact ? "p-3 sm:p-4" : "p-4 sm:p-5";

  return (
    <div className={`rounded-sm border border-primary/30 bg-primary/5 ${pad} space-y-3`}>
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Claim this track</p>
      <p className="text-[11px] text-zinc-400 leading-relaxed">
        This release was seeded by NEX staff. If you are the artist, request ownership so you can edit or archive it.
        Staff can approve your request, or use the instant claim code if you were given one.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <button
          type="button"
          disabled={claimRequestMutation.isPending || claimInfo.trim().length < 10}
          onClick={() => claimRequestMutation.mutate()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-widest bg-primary text-black hover:brightness-110 disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
          {claimRequestMutation.isPending ? "Sending…" : "Request admin approval"}
        </button>
      </div>
      <textarea
        value={claimInfo}
        onChange={(e) => setClaimInfo(e.target.value)}
        placeholder="Artist verification info (min 10 chars): release proof, channel/account link, etc."
        className="w-full bg-black/40 border border-white/10 rounded-sm px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-primary/40 focus:outline-none resize-none min-h-[72px] sm:min-h-[88px]"
      />
      <div className="pt-2 border-t border-white/10 space-y-2">
        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
          <KeyRound className="w-3 h-3" /> Instant claim (secret code)
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="password"
            autoComplete="off"
            placeholder="Enter code from staff"
            value={claimSecret}
            onChange={(e) => setClaimSecret(e.target.value)}
            className="flex-1 bg-black/50 border border-white/15 rounded-sm px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-primary/40 focus:outline-none"
          />
          <button
            type="button"
            disabled={claimInstantMutation.isPending || !claimSecret.trim()}
            onClick={() => claimInstantMutation.mutate(claimSecret)}
            className="px-4 py-2 rounded-sm text-[10px] font-black uppercase tracking-widest border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-40"
          >
            {claimInstantMutation.isPending ? "…" : "Claim now"}
          </button>
        </div>
      </div>
    </div>
  );
}
