import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Disc3, Mic2, Globe, Wrench, X, ChevronRight, CheckCircle2, Zap } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NexJoinModal({ open, onClose }: Props) {
  const handleJoin = () => {
    sessionStorage.setItem("nex_join_intent", "nex");
    window.location.href = "/api/login";
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative z-10 w-full max-w-md mx-4 bg-[#080808] border border-primary/20 rounded-sm shadow-[0_0_60px_rgba(0,240,255,0.15)]"
        >
          <div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <Disc3 className="w-5 h-5 text-primary animate-[spin_6s_linear_infinite]" />
              <span className="text-white font-display font-bold text-lg uppercase tracking-widest">JOIN NEX</span>
            </div>
            <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-8 space-y-8">
            <div className="text-center space-y-3">
              <Mic2 className="w-12 h-12 text-primary mx-auto" />
              <h2 className="text-2xl font-display font-bold text-white uppercase tracking-tight">
                BECOME A NEX CREATOR
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Join 50 elite AI music creators competing for the top spot on the NEO chart.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { icon: Zap, label: "Upload AI-generated tracks" },
                { icon: Zap, label: "Submit music videos" },
                { icon: Zap, label: "Compete on the NEO chart" },
                { icon: Zap, label: "Build your creator profile" },
                { icon: Zap, label: "Earn NEO Score recognition" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-zinc-300 uppercase tracking-widest text-[10px] font-bold">{label}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest text-center">
                Connect your account to continue.
                <br />Your artist profile will be set up after login.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleJoin}
                data-testid="button-join-nex"
                className="w-full flex items-center justify-center gap-3 bg-primary text-black font-bold uppercase tracking-widest py-4 rounded-sm hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)]"
              >
                <Disc3 className="w-4 h-4" />
                CONNECT & JOIN NEX
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
