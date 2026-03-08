import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, CheckCircle, XCircle, ExternalLink, Clock, RefreshCw } from "lucide-react";

type Submission = {
  id: number;
  title: string;
  creatorName: string;
  genre: string;
  trackLink: string;
  status: "PENDING" | "BATTLE_POOL" | "REJECTED" | "CHART";
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  BATTLE_POOL: "text-primary bg-primary/10 border-primary/30",
  REJECTED: "text-red-400 bg-red-400/10 border-red-400/30",
  CHART: "text-purple-400 bg-purple-400/10 border-purple-400/30",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm border ${STATUS_COLORS[status] ?? "text-zinc-500 bg-zinc-500/10 border-zinc-500/30"}`}>
      {status}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminPanel() {
  const { isAuthenticated, user } = useAuth();
  const qc = useQueryClient();

  const { data: submissions, isLoading, error, refetch } = useQuery<Submission[]>({
    queryKey: ["/api/admin/submissions"],
    retry: false,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("POST", `/api/admin/tracks/${id}/review`, { status }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/submissions"] });
    },
  });

  const pending = submissions?.filter((s) => s.status === "PENDING") ?? [];
  const processed = submissions?.filter((s) => s.status !== "PENDING") ?? [];

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ShieldCheck className="w-12 h-12 text-zinc-700 mx-auto mb-4" strokeWidth={1} />
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-600 mb-4">
          Admin access required
        </p>
        <a
          href="/api/login"
          className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
        >
          Login
        </a>
      </div>
    );
  }

  if (error && (error as any)?.message?.includes("403")) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ShieldCheck className="w-12 h-12 text-zinc-700 mx-auto mb-4" strokeWidth={1} />
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-2">
          Access restricted
        </p>
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
          Founder role required to access this panel
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-primary/60 mb-1">
            NEO Platform
          </p>
          <h1 className="text-2xl font-black uppercase tracking-[0.15em] text-white">
            Admin Panel
          </h1>
          <p className="text-[11px] text-zinc-500 uppercase tracking-widest mt-1">
            Track submission review · Approval queue
          </p>
        </div>
        <button
          onClick={() => refetch()}
          data-testid="button-refresh"
          className="p-2 border border-white/10 rounded-sm text-zinc-500 hover:text-primary hover:border-primary/30 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Pipeline summary */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {(["PENDING", "BATTLE_POOL", "REJECTED", "CHART"] as const).map((s) => {
          const count = submissions?.filter((t) => t.status === s).length ?? 0;
          return (
            <div
              key={s}
              className="border border-white/5 rounded-sm p-3 bg-black/20 text-center"
              data-testid={`stat-${s.toLowerCase()}`}
            >
              <p className="text-lg font-black text-white">{isLoading ? "—" : count}</p>
              <StatusBadge status={s} />
            </div>
          );
        })}
      </div>

      {/* Pending queue */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-4 h-4 text-yellow-400" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-400">
            Pending Review
          </p>
          {pending.length > 0 && (
            <span className="text-[9px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-sm">
              {pending.length}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="border border-white/5 rounded-sm p-6 text-center text-zinc-600 text-[10px] uppercase tracking-widest">
            Loading submissions…
          </div>
        ) : pending.length === 0 ? (
          <div className="border border-white/5 rounded-sm p-8 text-center bg-black/10">
            <CheckCircle className="w-8 h-8 text-zinc-700 mx-auto mb-3" strokeWidth={1} />
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
              No pending tracks
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {pending.map((track) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border border-yellow-400/10 bg-black/30 rounded-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                  data-testid={`row-pending-${track.id}`}
                >
                  {/* Track info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                        #{track.id}
                      </span>
                      <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest px-1.5 py-0.5 border border-white/5 rounded-sm">
                        {track.genre}
                      </span>
                    </div>
                    <p className="font-bold text-white text-sm truncate" data-testid={`text-title-${track.id}`}>
                      {track.title}
                    </p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                      {track.creatorName}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <a
                        href={track.trackLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] text-primary/70 hover:text-primary flex items-center gap-1 uppercase tracking-widest transition-colors"
                        data-testid={`link-track-${track.id}`}
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        Open Track
                      </a>
                      <span className="text-[9px] text-zinc-700 uppercase tracking-widest">
                        {formatDate(track.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status="PENDING" />
                    <button
                      onClick={() => reviewMutation.mutate({ id: track.id, status: "BATTLE_POOL" })}
                      disabled={reviewMutation.isPending}
                      data-testid={`button-approve-${track.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-primary border border-primary/40 bg-primary/10 hover:bg-primary/25 rounded-sm transition-all disabled:opacity-40"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Approve
                    </button>
                    <button
                      onClick={() => reviewMutation.mutate({ id: track.id, status: "REJECTED" })}
                      disabled={reviewMutation.isPending}
                      data-testid={`button-reject-${track.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-red-400 border border-red-400/30 bg-red-400/5 hover:bg-red-400/15 rounded-sm transition-all disabled:opacity-40"
                    >
                      <XCircle className="w-3 h-3" />
                      Reject
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Processed tracks */}
      {processed.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-4">
            Processed
          </p>
          <div className="space-y-1.5">
            {processed.map((track) => (
              <div
                key={track.id}
                className="border border-white/5 bg-black/15 rounded-sm px-4 py-3 flex items-center gap-4"
                data-testid={`row-processed-${track.id}`}
              >
                <span className="text-[9px] font-bold text-zinc-600 w-8">#{track.id}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-300 truncate">{track.title}</p>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest">
                    {track.creatorName} · {track.genre}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[9px] text-zinc-700 hidden sm:block">
                    {formatDate(track.createdAt)}
                  </span>
                  <StatusBadge status={track.status} />
                  <a
                    href={track.trackLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-600 hover:text-primary transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System flow reference */}
      <div className="mt-10 border border-white/5 rounded-sm p-4 bg-white/2 text-[9px] text-zinc-600 uppercase tracking-widest">
        <p className="text-zinc-500 font-bold mb-2">System flow</p>
        <p className="text-zinc-500">
          Submit → <span className="text-yellow-400">PENDING</span>{" "}
          → Approve → <span className="text-primary">BATTLE_POOL</span>{" "}
          → Battle × 10 · Win Rate ≥ 55% → <span className="text-purple-400">CHART</span>
        </p>
        <p className="mt-1">
          Reject → <span className="text-red-400">REJECTED</span> (excluded from battles)
        </p>
      </div>
    </div>
  );
}
