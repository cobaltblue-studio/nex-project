import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  CheckCircle,
  Music,
  Link,
  ChevronDown,
  User,
  Tag,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const GENRES = [
  "Electronic",
  "Synth Pop",
  "Rock",
  "Hip Hop",
  "Ambient",
  "Other",
] as const;

const SUPPORTED_LINKS = [
  { name: "YouTube", pattern: /youtube\.com|youtu\.be/ },
  { name: "SoundCloud", pattern: /soundcloud\.com/ },
  { name: "Suno", pattern: /suno\.com|suno\.ai/ },
];

const schema = z.object({
  title: z
    .string()
    .min(1, "Track title is required")
    .max(120, "Title too long"),
  artistName: z
    .string()
    .min(1, "Creator name is required")
    .max(80, "Name too long"),
  genre: z.enum(GENRES).optional(),
  trackLink: z
    .string()
    .url("Must be a valid URL")
    .refine(
      (url) => SUPPORTED_LINKS.some(({ pattern }) => pattern.test(url)),
      "Only YouTube, SoundCloud, or Suno links are accepted",
    ),
});

type FormData = z.infer<typeof schema>;

export default function SubmitTrack() {
  const { isAuthenticated, user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [trackId, setTrackId] = useState<number | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      artistName: "",
      genre: undefined,
      trackLink: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      apiRequest("POST", "/api/tracks/submit", data).then((r) => r.json()),
    onSuccess: (data) => {
      setTrackId(data.trackId);
      setSubmitted(true);
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const detectedPlatform = (() => {
    const link = form.watch("trackLink");
    if (!link) return null;
    return (
      SUPPORTED_LINKS.find(({ pattern }) => pattern.test(link))?.name ?? null
    );
  })();

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-primary/60 mb-2">
          NEX Platform
        </p>
        <h1 className="text-2xl font-black uppercase tracking-[0.15em] text-white">
          Submit Track
        </h1>
        <p className="text-[11px] text-zinc-500 uppercase tracking-widest mt-1">
          AI-generated music · Verified through Battle
        </p>
      </div>

      {/* Status path */}
      <div className="flex items-center gap-2 mb-8 text-[9px] font-bold uppercase tracking-widest">
        <span className="px-2 py-1 rounded-sm bg-primary/10 border border-primary/30 text-primary">
          PENDING
        </span>
        <span className="text-zinc-700">→</span>
        <span className="px-2 py-1 rounded-sm bg-white/5 border border-white/10 text-zinc-500">
          BATTLE_POOL
        </span>
        <span className="text-zinc-700">→</span>
        <span className="px-2 py-1 rounded-sm bg-white/5 border border-white/10 text-zinc-500">
          CHART
        </span>
      </div>

      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-primary/30 bg-primary/5 rounded-sm p-8 text-center"
          >
            <CheckCircle
              className="w-10 h-10 text-primary mx-auto mb-4"
              strokeWidth={1.5}
            />
            <p className="text-lg font-black uppercase tracking-[0.15em] text-white mb-1">
              Track Submitted
            </p>
            <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-6">
              Your track is now in review · ID #{trackId}
            </p>
            <div className="text-left border border-white/5 rounded-sm p-4 bg-black/30 mb-6 text-[10px] text-zinc-400 uppercase tracking-widest space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-600">Status</span>
                <span className="text-primary font-bold">PENDING</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Next step</span>
                <span>Admin Review</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">After approval</span>
                <span>BATTLE_POOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Chart entry</span>
                <span>10+ Battles · 55%+ Win Rate</span>
              </div>
            </div>
            <button
              onClick={() => {
                setSubmitted(false);
                setTrackId(null);
                form.reset();
              }}
              data-testid="button-submit-another"
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-primary transition-colors border border-white/10 hover:border-primary/30 px-4 py-2 rounded-sm"
            >
              Submit Another Track
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {!isAuthenticated && (
              <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-sm p-4 mb-6 text-center">
                <p className="text-[10px] text-yellow-400/80 uppercase tracking-widest">
                  <a
                    href="/api/login"
                    className="text-yellow-400 hover:underline font-bold"
                  >
                    Login
                  </a>{" "}
                  required to submit a track
                </p>
              </div>
            )}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Track Title */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-2">
                  <Music className="inline w-3 h-3 mr-1 -mt-0.5" />
                  Track Title
                </label>
                <input
                  {...form.register("title")}
                  placeholder="Enter your track title"
                  data-testid="input-track-title"
                  className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                />
                {form.formState.errors.title && (
                  <p className="text-[10px] text-red-400 mt-1 uppercase tracking-widest">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              {/* Creator Name */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-2">
                  <User className="inline w-3 h-3 mr-1 -mt-0.5" />
                  Creator Name
                </label>
                <input
                  {...form.register("artistName")}
                  placeholder="Your artist / creator name"
                  data-testid="input-creator-name"
                  className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                />
                {form.formState.errors.artistName && (
                  <p className="text-[10px] text-red-400 mt-1 uppercase tracking-widest">
                    {form.formState.errors.artistName.message}
                  </p>
                )}
              </div>

              {/* Genre */}
              <div>
                <label className="block ...">Genre (optional)</label>
                <div className="relative">
                  <select
                    {...form.register("genre")}
                    data-testid="select-genre"
                    className="w-full appearance-none bg-black/40 border border-white/10 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer"
                  >
                    <option value="">Optional</option>
                    {GENRES.map((g) => (
                      <option key={g} value={g} className="bg-[#050505]">
                        {g}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                </div>
                {form.formState.errors.genre && (
                  <p className="text-[10px] text-red-400 mt-1 uppercase tracking-widest">
                    {form.formState.errors.genre.message}
                  </p>
                )}
              </div>

              {/* Track Link */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-2">
                  <Link className="inline w-3 h-3 mr-1 -mt-0.5" />
                  Track Link
                </label>
                <div className="relative">
                  <input
                    {...form.register("trackLink")}
                    placeholder="YouTube, SoundCloud, or Suno URL"
                    data-testid="input-track-link"
                    className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-3 pr-28 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                  {detectedPlatform && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 rounded-sm">
                      {detectedPlatform}
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-zinc-700 uppercase tracking-widest mt-1.5">
                  Supported: YouTube · SoundCloud · Suno
                </p>
                {form.formState.errors.trackLink && (
                  <p className="text-[10px] text-red-400 mt-1 uppercase tracking-widest">
                    {form.formState.errors.trackLink.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={mutation.isPending || !isAuthenticated}
                  data-testid="button-submit-track"
                  className="w-full py-3.5 bg-primary/10 hover:bg-primary/20 border border-primary/40 hover:border-primary/60 text-primary text-[11px] font-black uppercase tracking-[0.3em] rounded-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                  {mutation.isPending ? "Submitting…" : "Submit Track"}
                </button>
              </div>

              {mutation.isError && (
                <p className="text-[10px] text-red-400 text-center uppercase tracking-widest">
                  {(mutation.error as Error)?.message ||
                    "Submission failed. Try again."}
                </p>
              )}

              {/* Info box */}
              <div className="border border-white/5 rounded-sm p-4 bg-white/2 text-[9px] text-zinc-600 uppercase tracking-widest space-y-1.5">
                <p className="text-zinc-500 font-bold mb-2">How it works</p>
                <p>① Submit → Status: PENDING (admin review)</p>
                <p>② Approved → Status: BATTLE_POOL (enter battle queue)</p>
                <p>③ 10+ battles · 55%+ win rate → Status: CHART</p>
                <p>
                  ④ Chart: max 100 tracks ranked by votes + plays + battle wins
                </p>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
