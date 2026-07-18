import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

/**
 * NexiCompanion — event-driven "living character" beat system for the Battle screen.
 *
 * Design intent (per 유비, 2026-07-18 direction):
 * NEXI is NOT a persistently-visible static widget with a fixed speech bubble.
 * It is a character that pops in around meaningful moments (entrance / reaction /
 * exit "beats" — Illumination-opening-short pacing), performs a short physical
 * gag with squash-and-stretch motion, shouts a line of invented pseudo-language
 * (제3의 언어 — Minions/Snoopy style: nonsense syllables whose meaning reads through
 * rhythm and context, not literal translation), then leaves the stage. It never
 * camps in a corner.
 *
 * This is a first pass using CSS/framer-motion only (no true frame animation).
 * If 유비 likes the beat structure and pseudo-language direction, the next step
 * is swapping this squash-and-stretch puppeteering for real AI-generated character
 * animation (Higgsfield-class tool), reusing the same cue system as the trigger layer.
 *
 * Technical foundations kept from the previous (reverted) pass:
 * - Real alpha-channel PNG (client/public/nexi/nexi-front.png), not a flattened composite.
 * - Rendered via React Portal into document.body, because Layout.tsx's root wrapper
 *   uses `overflow-x: hidden`, which visually clips `position: fixed` descendants in
 *   real browsers even though the CSS spec says only transform/filter/perspective/contain
 *   ancestors should do that.
 * - pointer-events: none on the whole stage — NEXI must never block a tap on a vote card.
 */

export type NexiCueType = "hello" | "curious" | "listening" | "unlock" | "victory";

export interface NexiCue {
  type: NexiCueType;
  nonce: number;
}

interface CueStyle {
  /** Total time on stage (ms), entrance through exit. */
  duration: number;
  /** Pseudo-language lines; one is picked at random each time so repeat viewings don't feel canned. */
  phrases: string[];
  /** 0.5 (calm) .. 1.4 (wild) — scales the squash-and-stretch amplitude. */
  intensity: number;
  /** Full 360 spin on entrance (victory only). */
  spin?: boolean;
  /** CSS class controlling the burst-text color/treatment. */
  accentClass: string;
}

const CUE_STYLES: Record<NexiCueType, CueStyle> = {
  hello: {
    duration: 2600,
    phrases: ["삐릿-!", "웅냐웅!", "오잉?!", "부비디밥~"],
    intensity: 0.9,
    accentClass: "nexi-burst-hello",
  },
  curious: {
    duration: 2200,
    phrases: ["으잉...?", "웅우웅?", "삐로록?", "훔... 뭐지?"],
    intensity: 0.7,
    accentClass: "nexi-burst-curious",
  },
  listening: {
    duration: 3200,
    phrases: ["음챠음챠~", "두비두밥~", "웅... 좋은데?", "챱챱챱~"],
    intensity: 0.6,
    accentClass: "nexi-burst-listening",
  },
  unlock: {
    duration: 2800,
    phrases: ["삐용삐용!!", "지금이야!!", "우비딥-!", "고고고!!"],
    intensity: 1.2,
    accentClass: "nexi-burst-unlock",
  },
  victory: {
    duration: 3800,
    phrases: ["두비루빠!!", "와바밤-!!", "빰빠라밤!!", "예에에잇!!"],
    intensity: 1.4,
    spin: true,
    accentClass: "nexi-burst-victory",
  },
};

/** Fixed-length keyframe timeline shared by every cue; only amplitude/spin differ. */
const TIMES = [0, 0.15, 0.26, 0.38, 0.5, 0.68, 0.84, 1];

function buildAvatarAnimation(style: CueStyle) {
  const { intensity, spin } = style;
  const scale = [
    0.3,
    1 + 0.35 * intensity,
    1 - 0.12 * intensity,
    1 + 0.12 * intensity,
    1,
    1 + 0.08 * intensity,
    1,
    0.3,
  ];
  const rotAmp = 14 * intensity;
  const rotate = spin
    ? [-rotAmp, 130, 260, 360, 350, 8, 0, rotAmp]
    : [-rotAmp, rotAmp * 0.6, -rotAmp * 0.4, rotAmp * 0.3, 0, rotAmp * 0.25, 0, rotAmp];
  const y = [44, -20 * intensity, 2, -8 * intensity, 0, -4 * intensity, 0, 44];
  return { scale, rotate, y, times: TIMES };
}

function pickPhrase(phrases: string[]): string {
  return phrases[Math.floor(Math.random() * phrases.length)];
}

export function NexiCompanion({ cue }: { cue: NexiCue | null }) {
  const [active, setActive] = useState<{ cue: NexiCue; phrase: string } | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNonceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!cue || cue.nonce === lastNonceRef.current) return;
    lastNonceRef.current = cue.nonce;

    const style = CUE_STYLES[cue.type];
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setActive({ cue, phrase: pickPhrase(style.phrases) });

    hideTimerRef.current = setTimeout(() => {
      setActive(null);
    }, style.duration);

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [cue]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="nexi-stage" aria-hidden>
      <AnimatePresence>
        {active && (
          <motion.div
            key={active.cue.nonce}
            className="nexi-stage-actor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
          >
            <motion.div
              className={`nexi-burst-text ${CUE_STYLES[active.cue.type].accentClass}`}
              initial={{ opacity: 0, y: 6, scale: 0.6 }}
              animate={{ opacity: [0, 1, 1, 0], y: [6, -4, -4, -10], scale: [0.6, 1.12, 1, 0.9] }}
              transition={{
                duration: CUE_STYLES[active.cue.type].duration / 1000,
                times: [0, 0.16, 0.62, 1],
                ease: "easeOut",
              }}
            >
              {active.phrase}
            </motion.div>
            <motion.img
              src="/nexi/nexi-front.png"
              alt=""
              className="nexi-stage-img"
              animate={buildAvatarAnimation(CUE_STYLES[active.cue.type])}
              transition={{
                duration: CUE_STYLES[active.cue.type].duration / 1000,
                times: TIMES,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
