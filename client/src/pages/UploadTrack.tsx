import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Music, ArrowLeft, CheckCircle2 } from "lucide-react";

const AI_TOOLS = ["Suno", "Udio", "Stable Audio", "MusicGen", "Other"];
const GENRES = ["Synthwave", "Pop", "EDM", "Ambient", "Experimental", "Hip-Hop", "Cinematic", "Lo-Fi", "Other"];

export function UploadTrack() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/profiles/me"],
    queryFn: async () => {
      const res = await fetch("/api/profiles/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated,
    retry: false,
  });

  const [title, setTitle] = useState("");
  const [aiTool, setAiTool] = useState("");
  const [genre, setGenre] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [description, setDescription] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (authLoading || profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-primary/60">Initializing...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="py-40 text-center space-y-6">
        <p className="font-display text-2xl uppercase tracking-widest text-zinc-500">Authentication Required</p>
        <a href="/api/login" className="inline-block border border-primary/30 text-primary px-6 py-3 text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-primary/10 transition-all">
          Login to Continue
        </a>
      </div>
    );
  }

  if (profile?.role !== "nex") {
    return (
      <div className="py-40 text-center space-y-6">
        <div className="border border-white/5 border-dashed p-16 rounded-sm max-w-md mx-auto space-y-4">
          <Music className="w-12 h-12 text-zinc-700 mx-auto" />
          <p className="font-display text-xl uppercase tracking-widest text-zinc-500">Creator Access Only</p>
          <p className="text-zinc-600 text-sm">Only NEX Creator accounts can upload tracks.</p>
        </div>
        <Link href="/" className="inline-block text-zinc-500 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors">
          Return Home
        </Link>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!title.trim()) return toast({ title: "MISSING FIELD", description: "Track title is required.", variant: "destructive" });
    if (!aiTool) return toast({ title: "MISSING FIELD", description: "Select an AI tool.", variant: "destructive" });
    if (!genre) return toast({ title: "MISSING FIELD", description: "Select a genre.", variant: "destructive" });
    if (!audioUrl.trim()) return toast({ title: "MISSING FIELD", description: "Audio source URL is required.", variant: "destructive" });
    if (!confirmed) return toast({ title: "CONFIRMATION REQUIRED", description: "Confirm the track is AI-generated.", variant: "destructive" });

    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/tracks", {
        title: title.trim(),
        aiTool,
        genre,
        audioUrl: audioUrl.trim(),
        mvUrl: videoUrl.trim() || undefined,
        coverImage: coverImage.trim() || undefined,
        description: description.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tracks/my"] });
      toast({ title: "TRACK UPLOADED", description: "Your track is now live in the charts." });
      navigate("/my-tracks");
    } catch (err: any) {
      toast({ title: "UPLOAD FAILED", description: err?.message || "Try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto pb-20 space-y-10">
      <Link href="/my-tracks" className="inline-flex items-center gap-2 text-zinc-500 hover:text-primary transition-colors text-[10px] font-bold uppercase tracking-[0.2em]">
        <ArrowLeft className="w-4 h-4" /> My Tracks
      </Link>

      <div className="space-y-2">
        <h1 className="font-display text-4xl font-bold uppercase tracking-tighter text-white">Upload Track</h1>
        <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest">Submit AI-generated music to NEX charts</p>
      </div>

      <div className="bg-[#080808] border border-white/5 rounded-sm p-8 space-y-8">

        {/* Track Title */}
        <Field label="Track Title" required>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Enter track title"
            maxLength={80}
            data-testid="input-track-title"
            className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-primary/50 placeholder:text-zinc-700 font-mono transition-colors"
          />
        </Field>

        {/* AI Tool */}
        <Field label="AI Tool Used" required>
          <div className="grid grid-cols-3 gap-2">
            {AI_TOOLS.map(tool => (
              <button
                key={tool}
                type="button"
                onClick={() => setAiTool(tool)}
                data-testid={`button-aitool-${tool.toLowerCase()}`}
                className={`py-2.5 px-3 text-[10px] font-bold uppercase tracking-widest rounded-sm border transition-all ${
                  aiTool === tool
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-white/10 text-zinc-500 hover:border-white/30 hover:text-white"
                }`}
              >
                {tool}
              </button>
            ))}
          </div>
        </Field>

        {/* Genre */}
        <Field label="Genre" required>
          <select
            value={genre}
            onChange={e => setGenre(e.target.value)}
            data-testid="select-genre"
            className="w-full bg-[#0A0A0A] border border-white/10 text-white text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-primary/50 appearance-none font-mono transition-colors"
          >
            <option value="">Select genre</option>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </Field>

        {/* Audio Source URL */}
        <Field label="Audio Source URL" required hint="YouTube, Suno, Udio, SoundCloud, Vimeo, or any embeddable URL">
          <input
            type="url"
            value={audioUrl}
            onChange={e => setAudioUrl(e.target.value)}
            placeholder="https://suno.com/song/..."
            data-testid="input-audio-url"
            className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-primary/50 placeholder:text-zinc-700 font-mono transition-colors"
          />
        </Field>

        {/* Video Source URL */}
        <Field label="Video Source URL" hint="Optional — appears in Music Video Chart if provided">
          <input
            type="url"
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            data-testid="input-video-url"
            className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-primary/50 placeholder:text-zinc-700 font-mono transition-colors"
          />
        </Field>

        {/* Cover Image URL */}
        <Field label="Cover Image URL" hint="Optional — link to a square image (e.g. from Imgur, Cloudinary)">
          <input
            type="url"
            value={coverImage}
            onChange={e => setCoverImage(e.target.value)}
            placeholder="https://example.com/cover.jpg"
            data-testid="input-cover-image"
            className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-primary/50 placeholder:text-zinc-700 font-mono transition-colors"
          />
          {coverImage && (
            <div className="mt-2 w-20 h-20 rounded-sm overflow-hidden border border-white/10">
              <img src={coverImage} alt="Cover preview" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
          )}
        </Field>

        {/* Description */}
        <Field label="Description" hint="Optional — tell the story of how you created this track">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe your track, inspiration, creation process..."
            rows={3}
            maxLength={500}
            data-testid="input-description"
            className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-primary/50 placeholder:text-zinc-700 font-mono resize-none transition-colors"
          />
          <p className="text-right text-[9px] text-zinc-700 font-mono">{description.length}/500</p>
        </Field>

        {/* Confirmation */}
        <button
          type="button"
          onClick={() => setConfirmed(v => !v)}
          data-testid="checkbox-confirm"
          className={`w-full flex items-start gap-3 p-4 rounded-sm border transition-all text-left ${
            confirmed ? "border-primary/40 bg-primary/5" : "border-white/10 bg-white/[0.02] hover:border-white/20"
          }`}
        >
          <div className={`w-4 h-4 mt-0.5 rounded-sm border flex-shrink-0 flex items-center justify-center transition-all ${
            confirmed ? "bg-primary border-primary" : "border-white/30"
          }`}>
            {confirmed && <CheckCircle2 className="w-3 h-3 text-black" />}
          </div>
          <span className={`text-[11px] font-bold uppercase tracking-widest leading-relaxed ${confirmed ? "text-primary" : "text-zinc-500"}`}>
            I confirm this track is primarily AI-generated.
          </span>
        </button>

        {/* Submit */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleSubmit}
          disabled={submitting}
          data-testid="button-upload-submit"
          className="w-full flex items-center justify-center gap-3 py-4 bg-primary text-black font-display font-bold text-sm uppercase tracking-widest rounded-sm hover:brightness-110 transition-all disabled:opacity-50"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
          ) : (
            <><Upload className="w-4 h-4" /> Submit Track</>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

function Field({ label, required, hint, children }: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        {label}
        {required && <span className="text-primary">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-zinc-700 font-mono">{hint}</p>}
    </div>
  );
}
