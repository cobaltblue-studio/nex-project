import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Disc3, User, Mic2, Globe, Wrench, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

const AI_TOOLS = ["Suno", "Udio", "Stable Audio", "MusicGen", "Bark", "Other"];
const COUNTRIES = [
  "South Korea", "United States", "Japan", "United Kingdom", "Germany", "France",
  "Brazil", "Canada", "Australia", "China", "India", "Mexico", "Spain", "Italy",
  "Netherlands", "Sweden", "Norway", "Denmark", "Finland", "Other"
];

function sanitizeUsername(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || "NeoUser";
}

export function OnboardingModal() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"role" | "creator-setup">("role");
  const [artistName, setArtistName] = useState("");
  const [country, setCountry] = useState("");
  const [aiTool, setAiTool] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Check if user has a profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/profiles/me"],
    queryFn: async () => {
      const res = await fetch("/api/profiles/me", { credentials: "include" });
      if (res.status === 404) return null;
      if (res.status === 401) return null;
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    if (!authLoading && !profileLoading && isAuthenticated && profile === null) {
      setOpen(true);
    }
  }, [isAuthenticated, profile, authLoading, profileLoading]);

  // Pre-fill artist name from Replit user data
  useEffect(() => {
    if (user && !artistName) {
      const firstName = (user as any).firstName || "";
      const lastName = (user as any).lastName || "";
      const combined = (firstName + lastName).trim();
      if (combined) setArtistName(sanitizeUsername(combined));
    }
  }, [user]);

  const handleListenerSelect = async () => {
    setSubmitting(true);
    try {
      // Auto-generate username from Replit account
      const firstName = (user as any)?.firstName || "";
      const lastName = (user as any)?.lastName || "";
      const base = sanitizeUsername((firstName + lastName).trim()) || "Listener";
      const username = `${base}${Math.floor(Math.random() * 9000) + 1000}`;

      await apiRequest("POST", "/api/profiles", {
        username,
        role: "listener",
        country: null,
        aiToolUsed: null,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      setOpen(false);
      navigate("/");
      toast({
        title: "WELCOME TO NEX",
        description: "You are now listening.",
      });
    } catch (err: any) {
      const msg = err?.message || "Failed to create profile";
      // If username collision, try again with different number
      if (msg.includes("409") || msg.includes("already taken")) {
        await retryListenerCreate();
      } else {
        toast({ title: "ERROR", description: msg, variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const retryListenerCreate = async () => {
    const username = `Listener${Date.now().toString().slice(-6)}`;
    try {
      await apiRequest("POST", "/api/profiles", { username, role: "listener" });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      setOpen(false);
      navigate("/");
    } catch {
      toast({ title: "ERROR", description: "Could not create profile. Please try again.", variant: "destructive" });
    }
  };

  const handleCreatorSetup = () => {
    setStep("creator-setup");
  };

  const handleCreatorSubmit = async () => {
    if (!artistName.trim()) {
      toast({ title: "ARTIST NAME REQUIRED", description: "Enter your artist name.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/profiles", {
        username: artistName.trim(),
        role: "nex",
        country: country || null,
        aiToolUsed: aiTool || null,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      setOpen(false);
      navigate("/");
      toast({ title: "CREATOR PROFILE ACTIVATED", description: `Welcome to NEX, ${artistName}.` });
    } catch (err: any) {
      const msg = err?.message || "Failed to create profile";
      toast({ title: "ERROR", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-lg mx-4 bg-[#080808] border border-white/10 rounded-sm shadow-[0_0_80px_rgba(0,240,255,0.08)]"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-8 pt-8 pb-6 border-b border-white/5">
            <Disc3 className="w-5 h-5 text-primary animate-[spin_6s_linear_infinite] flex-shrink-0" />
            <span className="text-white font-display font-bold text-lg uppercase tracking-widest">
              {step === "role" ? "WELCOME TO NEX" : "CREATOR SETUP"}
            </span>
          </div>

          {/* STEP 1: Role Selection */}
          {step === "role" && (
            <div className="p-8 space-y-6">
              <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest text-center">
                How do you want to experience NEX?
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* LISTENER */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleListenerSelect}
                  disabled={submitting}
                  data-testid="button-role-listener"
                  className="flex flex-col items-center gap-5 p-7 bg-white/[0.03] border border-white/10 rounded-sm hover:border-white/30 hover:bg-white/5 transition-all group disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-10 h-10 text-zinc-400 animate-spin" />
                  ) : (
                    <User className="w-10 h-10 text-zinc-400 group-hover:text-white transition-colors" />
                  )}
                  <div className="text-center">
                    <p className="font-display font-bold text-white uppercase tracking-widest text-sm">LISTENER</p>
                  </div>
                  <div className="w-full space-y-2">
                    {["Listen to music", "Vote for tracks", "Follow creators"].map(f => (
                      <div key={f} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{f}</span>
                      </div>
                    ))}
                  </div>
                </motion.button>

                {/* CREATOR / NEX */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCreatorSetup}
                  disabled={submitting}
                  data-testid="button-role-creator"
                  className="flex flex-col items-center gap-5 p-7 bg-primary/[0.04] border border-primary/20 rounded-sm hover:border-primary/50 hover:bg-primary/10 transition-all group disabled:opacity-50"
                >
                  <Mic2 className="w-10 h-10 text-primary/60 group-hover:text-primary transition-colors" />
                  <div className="text-center">
                    <p className="font-display font-bold text-primary uppercase tracking-widest text-sm">CREATOR</p>
                    <p className="text-[9px] text-primary/50 uppercase tracking-widest mt-0.5">NEX</p>
                  </div>
                  <div className="w-full space-y-2">
                    {["Upload AI-generated tracks", "Compete in charts", "Build a creator profile"].map(f => (
                      <div key={f} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-primary/40 flex-shrink-0" />
                        <span className="text-[10px] text-primary/50 uppercase tracking-widest">{f}</span>
                      </div>
                    ))}
                  </div>
                </motion.button>
              </div>
            </div>
          )}

          {/* STEP 2: Creator Setup */}
          {step === "creator-setup" && (
            <div className="p-8 space-y-5">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-sm">
                <Mic2 className="w-4 h-4 text-primary flex-shrink-0" />
                <p className="text-[10px] text-primary font-bold uppercase tracking-widest">NEX Creator Account</p>
              </div>

              {/* Artist Name */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  <User className="w-3 h-3" />
                  ARTIST NAME *
                </label>
                <input
                  type="text"
                  value={artistName}
                  onChange={e => setArtistName(e.target.value)}
                  placeholder="e.g. PulseAI"
                  className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-primary/50 placeholder:text-zinc-700 font-mono uppercase tracking-wide transition-colors"
                  maxLength={30}
                  data-testid="input-artist-name"
                  autoFocus
                />
              </div>

              {/* Country */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  <Globe className="w-3 h-3" />
                  COUNTRY
                </label>
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/10 text-white text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-primary/50 appearance-none font-mono transition-colors"
                  data-testid="select-country"
                >
                  <option value="">Select Country</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Primary AI Tool */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  <Wrench className="w-3 h-3" />
                  PRIMARY AI TOOL
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {AI_TOOLS.map(tool => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => setAiTool(tool)}
                      className={`text-[10px] font-bold uppercase tracking-widest py-2.5 px-2 rounded-sm border transition-all ${
                        aiTool === tool
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-white/10 text-zinc-500 hover:border-white/30 hover:text-white"
                      }`}
                    >
                      {tool}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep("role")}
                  disabled={submitting}
                  className="flex-1 py-3 border border-white/10 text-zinc-500 text-[10px] font-bold uppercase tracking-widest rounded-sm hover:border-white/30 hover:text-white transition-all disabled:opacity-50"
                >
                  Back
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreatorSubmit}
                  disabled={submitting}
                  data-testid="button-activate-creator"
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-black text-[10px] font-bold uppercase tracking-widest rounded-sm hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <>ACTIVATE <ChevronRight className="w-4 h-4" /></>
                  )}
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
