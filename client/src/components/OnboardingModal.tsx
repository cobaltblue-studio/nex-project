import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Disc3, User, Mic2, Globe, Wrench, X, ChevronRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const AI_TOOLS = ["Suno", "Udio", "Stable Audio", "MusicGen", "Bark", "Other"];
const COUNTRIES = [
  "South Korea", "United States", "Japan", "United Kingdom", "Germany", "France",
  "Brazil", "Canada", "Australia", "China", "India", "Mexico", "Spain", "Italy",
  "Netherlands", "Sweden", "Norway", "Denmark", "Finland", "Other"
];

export function OnboardingModal() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"role" | "details">("role");
  const [role, setRole] = useState<"listener" | "nex" | null>(null);
  const [username, setUsername] = useState("");
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
      // Check sessionStorage for intent
      const intent = sessionStorage.getItem("nex_join_intent");
      if (intent === "nex") {
        setRole("nex");
        setStep("details");
      }
      setOpen(true);
    }
  }, [isAuthenticated, profile, authLoading, profileLoading]);

  const handleRoleSelect = (r: "listener" | "nex") => {
    setRole(r);
    setStep("details");
  };

  const handleSubmit = async () => {
    if (!username.trim()) {
      toast({ title: "USERNAME REQUIRED", description: "Enter your artist/display name.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/profiles", {
        username: username.trim(),
        role,
        country: country || null,
        aiToolUsed: role === "nex" ? (aiTool || null) : null,
      });
      sessionStorage.removeItem("nex_join_intent");
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      setOpen(false);
      toast({ title: "PROFILE ACTIVATED", description: `Welcome to NEO, ${username}.` });
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
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative z-10 w-full max-w-lg mx-4 bg-[#080808] border border-white/10 rounded-sm shadow-[0_0_60px_rgba(0,240,255,0.1)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <Disc3 className="w-5 h-5 text-primary animate-[spin_6s_linear_infinite]" />
              <span className="text-white font-display font-bold text-lg uppercase tracking-widest">
                {step === "role" ? "JOIN NEO" : role === "nex" ? "CREATOR SETUP" : "LISTENER SETUP"}
              </span>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {step === "role" ? (
              <>
                <p className="text-zinc-400 text-sm font-sans text-center">
                  Choose how you want to experience NEO
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRoleSelect("listener")}
                    className="flex flex-col items-center gap-4 p-8 bg-white/5 border border-white/10 rounded-sm hover:border-primary/40 hover:bg-primary/5 transition-all group"
                  >
                    <User className="w-10 h-10 text-zinc-400 group-hover:text-primary transition-colors" />
                    <div className="text-center">
                      <p className="font-display font-bold text-white uppercase tracking-widest text-sm">LISTENER</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Fan</p>
                    </div>
                    <div className="space-y-1 text-left w-full">
                      {["Listen & Watch", "Vote for tracks", "Follow creators"].map(f => (
                        <div key={f} className="flex items-center gap-2 text-[10px] text-zinc-500">
                          <CheckCircle2 className="w-3 h-3 text-primary/60 flex-shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRoleSelect("nex")}
                    className="flex flex-col items-center gap-4 p-8 bg-primary/5 border border-primary/20 rounded-sm hover:border-primary/60 hover:bg-primary/10 transition-all group"
                  >
                    <Mic2 className="w-10 h-10 text-primary/60 group-hover:text-primary transition-colors" />
                    <div className="text-center">
                      <p className="font-display font-bold text-primary uppercase tracking-widest text-sm">CREATOR</p>
                      <p className="text-[10px] text-primary/50 uppercase tracking-widest mt-1">NEX</p>
                    </div>
                    <div className="space-y-1 text-left w-full">
                      {["Upload tracks & MVs", "Chart ranking", "Creator profile", "Earn NEO Score"].map(f => (
                        <div key={f} className="flex items-center gap-2 text-[10px] text-primary/50">
                          <CheckCircle2 className="w-3 h-3 text-primary/60 flex-shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </motion.button>
                </div>
              </>
            ) : (
              <div className="space-y-5">
                {role === "nex" && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/20 rounded-sm">
                    <Mic2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <p className="text-[10px] text-primary font-bold uppercase tracking-widest">NEX Creator Account</p>
                  </div>
                )}

                {/* Artist / Display Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <User className="w-3 h-3" />
                    {role === "nex" ? "ARTIST NAME" : "DISPLAY NAME"} *
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder={role === "nex" ? "e.g. PulseAI" : "e.g. NeoListener"}
                    className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-primary/60 placeholder:text-zinc-700 font-mono uppercase tracking-wide"
                    maxLength={30}
                    data-testid="input-username"
                  />
                </div>

                {/* Country */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    <Globe className="w-3 h-3" />
                    COUNTRY
                  </label>
                  <select
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-white/10 text-white text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-primary/60 appearance-none font-mono"
                    data-testid="select-country"
                  >
                    <option value="">Select Country</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* AI Tool (NEX only) */}
                {role === "nex" && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                      <Wrench className="w-3 h-3" />
                      PRIMARY AI TOOL
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {AI_TOOLS.map(tool => (
                        <button
                          key={tool}
                          type="button"
                          onClick={() => setAiTool(tool)}
                          className={`text-[10px] font-bold uppercase tracking-widest py-2 px-3 rounded-sm border transition-all ${
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
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep("role")}
                    className="flex-1 py-3 border border-white/10 text-zinc-500 text-[10px] font-bold uppercase tracking-widest rounded-sm hover:border-white/30 hover:text-white transition-all"
                  >
                    Back
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={submitting}
                    data-testid="button-submit-profile"
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-black text-[10px] font-bold uppercase tracking-widest rounded-sm hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {submitting ? "ACTIVATING..." : "ACTIVATE PROFILE"}
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
