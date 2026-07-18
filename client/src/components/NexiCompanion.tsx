import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

/**
 * NexiCompanion — event-driven "living character" beat system for the Battle screen.
 *
 * Design intent (per 유비, 2026-07-18 direction, refined after his "PPT 애니메이션" critique):
 * NEXI is not a mascot glued to one corner of the screen. It has to feel like it is
 * IN the scene, reacting to the specific thing that just happened:
 *   - Battle screen opens  -> NEXI sneaks a peek from behind the edge of the screen,
 *     not a full bounce-in. Coy, brief, retreats.
 *   - A track starts playing -> NEXI perches at the corner of the player card, like
 *     it's leaning in to listen.
 *   - Voting unlocks -> NEXI pops up right next to the "VS" callout.
 *   - Result lands -> NEXI appears directly beside the WINNING track's percentage
 *     number, celebrating that specific number, not floating in a generic corner.
 * Only "hello" (battle intro) and "curious" (loading) have no natural on-page anchor,
 * so those two use a screen-edge peek instead of a fixed corner.
 *
 * This is a first pass using CSS/framer-motion only (no true frame animation). If 유비
 * likes the beat + anchoring structure, the next step is swapping this squash-and-stretch
 * puppeteering for real AI-generated character animation (Higgsfield-class tool), reusing
 * this same cue/anchor system as the trigger layer.
 *
 * Technical foundations kept from the previous passes:
 * - Real alpha-channel PNG (client/public/nexi/nexi-front.png).
 * - Rendered via React Portal into document.body, because Layout.tsx's root wrapper
 *   uses `overflow-x: hidden`, which visually clips `position: fixed` descendants in
 *   real browsers even though the CSS spec says only transform/filter/perspective/contain
 *   ancestors should do that.
 * - pointer-events: none on the whole stage — NEXI must never block a tap on a vote card.
 */

export type NexiCueType = "hello" | "curious" | "listening" | "unlock" | "victory";

export interface NexiAnchor {
  /** Viewport-space coordinates (px), typically the target element's getBoundingClientRect(). */
  x: number;
  y: number;
}

export interface NexiCue {
  type: NexiCueType;
  nonce: number;
  /** Contextual on-page target to appear beside. Omitted => screen-edge peek. */
  anchor?: NexiAnchor;
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
    duration: 2400,
    phrases: ["삐릿-!", "웅냐웅!", "오잉?!", "부비디밥~"],
    intensity: 0.55,
    accentClass: "nexi-burst-hello",
  },
  curious: {
    duration: 2000,
    phrases: ["으잉...?", "웅우웅?", "삐로록?", "훔... 뭐지?"],
    intensity: 0.5,
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

/** Fixed-length keyframe timeline shared by anchored (pop-in) cues. */
const POP_TIMES = [0, 0.15, 0.26, 0.38, 0.5, 0.68, 0.84, 1];

function buildPopAnimation(style: CueStyle) {
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
  const y = [30, -16 * intensity, 2, -6 * intensity, 0, -4 * intensity, 0, 30];
  return { scale, rotate, y, times: POP_TIMES };
}

/** Screen-edge "peek" timeline for hello/curious — coy, small, no natural anchor to attach to. */
const PEEK_TIMES = [0, 0.22, 0.4, 0.58, 0.8, 1];

function buildPeekAnimation(fromRight: boolean) {
  const dir = fromRight ? 1 : -1;
  return {
    x: [dir * 92, dir * 10, dir * 16, dir * 8, dir * 12, dir * 92],
    rotate: [dir * 6, -dir * 3, dir * 2, -dir * 2, dir * 2, dir * 6],
    scale: [0.85, 1.03, 0.98, 1.02, 0.99, 0.85],
    times: PEEK_TIMES,
  };
}

function pickPhrase(phrases: string[]): string {
  return phrases[Math.floor(Math.random() * phrases.length)];
}

/** Resolves where the actor sits for this frame: clamped to an anchor, or a screen-edge peek slot. */
function resolveStagePosition(cue: NexiCue): { style: CSSProperties; edgePeek: null | "left" | "right" } {
  if (typeof window === "undefined") {
    return { style: {}, edgePeek: null };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const mobile = vw < 768;
  const avatar = mobile ? 84 : 148;
  const margin = 10;
  const headerClearance = 72;

  if (cue.anchor) {
    const left = Math.min(Math.max(cue.anchor.x - avatar * 0.35, margin), vw - avatar - margin);
    const top = Math.min(
      Math.max(cue.anchor.y - avatar * 0.7, headerClearance),
      vh - avatar - margin,
    );
    return { style: { left, top }, edgePeek: null };
  }

  // No anchor: hello peeks from the right edge near the top, curious peeks from the left mid-screen.
  if (cue.type === "curious") {
    return { style: { left: 0, top: vh * 0.46 }, edgePeek: "left" };
  }
  return { style: { left: vw - avatar, top: vh * 0.24 }, edgePeek: "right" };
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
        {active &&
          (() => {
            const style = CUE_STYLES[active.cue.type];
            const { style: posStyle, edgePeek } = resolveStagePosition(active.cue);
            const durationSec = style.duration / 1000;
            return (
              <motion.div
                key={active.cue.nonce}
                className="nexi-stage-actor"
                style={posStyle}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
              >
                <motion.div
                  className={`nexi-burst-text ${style.accentClass}`}
                  initial={{ opacity: 0, y: 6, scale: 0.6 }}
                  animate={{ opacity: [0, 1, 1, 0], y: [6, -4, -4, -10], scale: [0.6, 1.12, 1, 0.9] }}
                  transition={{
                    duration: durationSec,
                    times: [0, 0.16, 0.62, 1],
                    ease: "easeOut",
                  }}
                >
                  {active.phrase}
                </motion.div>
                {edgePeek ? (
                  <motion.img
                    src="/nexi/nexi-front.png"
                    alt=""
                    className="nexi-stage-img"
                    animate={buildPeekAnimation(edgePeek === "right")}
                    transition={{ duration: durationSec, times: PEEK_TIMES, ease: "easeInOut" }}
                  />
                ) : (
                  <motion.img
                    src="/nexi/nexi-front.png"
                    alt=""
                    className="nexi-stage-img"
                    animate={buildPopAnimation(style)}
                    transition={{ duration: durationSec, times: POP_TIMES, ease: "easeInOut" }}
                  />
                )}
              </motion.div>
            );
          })()}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
