import { motion, AnimatePresence } from "framer-motion";
import { Disc3, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
  open: boolean;
  onClose: () => void;
};

/** Playful “NEX guardian” — vinyl disc mascot tells submitters about the 2-track cap. */
export function TrackLimitGuardianModal({ open, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="track-limit-guardian-title"
          data-testid="modal-track-limit-guardian"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            aria-label={t("submitTrack.limitGuardianDismiss")}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 w-full max-w-md"
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <div className="premium-card border border-primary/35 p-8 text-center space-y-5 shadow-[0_0_48px_-12px_hsl(var(--primary)/0.45)]">
              <motion.div
                className="mx-auto w-24 h-24 rounded-full border-2 border-primary/50 bg-black/60 flex items-center justify-center relative"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                <Disc3 className="w-14 h-14 text-primary drop-shadow-[0_0_12px_hsl(var(--primary)/0.7)]" />
                <Sparkles className="w-4 h-4 text-primary/80 absolute -top-1 -right-1" />
              </motion.div>
              <p className="text-[9px] font-black uppercase tracking-[0.45em] text-primary/70">
                {t("submitTrack.limitGuardianEyebrow")}
              </p>
              <h2
                id="track-limit-guardian-title"
                className="text-lg md:text-xl font-display font-bold text-white uppercase tracking-tight leading-snug"
              >
                {t("submitTrack.limitGuardianTitle")}
              </h2>
              <p className="text-sm text-zinc-300 leading-relaxed normal-case tracking-normal">
                {t("submitTrack.limitGuardianBody")}
              </p>
              <p className="text-[11px] text-zinc-500 normal-case leading-relaxed">
                {t("submitTrack.limitGuardianHint")}
              </p>
              <button
                type="button"
                onClick={onClose}
                data-testid="button-track-limit-guardian-ok"
                className="w-full py-3 text-[10px] font-black uppercase tracking-[0.28em] rounded-sm border border-primary/40 bg-primary/15 text-primary hover:bg-primary/25 transition-all"
              >
                {t("submitTrack.limitGuardianDismiss")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
