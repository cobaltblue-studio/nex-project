import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * NEXI Companion — v2 (rebuilt after the v1 revert on 2026-07-17).
 *
 * Why v1 broke (see nex-project git history: 54f02c3 -> 93565d7):
 *   1. The art assets were flattened/chroma-keyed onto a solid background instead of
 *      carrying a real alpha channel, so edges fringed/haloed depending on what was
 *      behind them.
 *   2. NEXI was positioned with `position:absolute; left/right:-34px` *inside* the
 *      battle card, i.e. outside its parent's own box. That only renders correctly
 *      when the ancestor chain happens to allow overflow and there's spare page
 *      margin outside the card — both assumptions collapse on narrow/mobile
 *      viewports, which is exactly where it broke.
 *
 * Fix in this version:
 *   - Real alpha-channel PNGs (client/public/nexi/*.png), verified pixel-by-pixel.
 *   - NEXI is `position: fixed` to the viewport corner, not nested inside any card.
 *     It has zero dependency on an ancestor's overflow/positioning context, so it
 *     cannot be clipped by a parent again. This also makes it trivial to reuse on
 *     any other page later (Upload, Comments, 404, etc.) — see CBSU-HOME-076 /
 *     the NEXI Character Bible for the "NEXI is everywhere" concept this scaffolds.
 *
 * Scope for this pass: Battle screen only, wired via the `mood` prop. NEXI does not
 * explain features or judge tracks — per the NEXI golden rule, it is a small witness
 * to the creator's nervousness/wait/courage, tied to NEX's "Discovery" motif.
 */

export type NexiMood =
  | "idle"
  | "curious"
  | "listening"
  | "waiting"
  | "excited";

const MOOD_LINES: Record<NexiMood, string[]> = {
  idle: ["오늘도 발견하러 왔어요"],
  curious: ["무슨 곡이 나올까? 같이 들어봐요"],
  listening: ["귀 기울이는 중...", "이 트랙, 느낌 있는데요?"],
  waiting: ["두 곡 다 들으면 투표할 수 있어요", "creator들이 기다리고 있어요"],
  excited: ["짜릿하다! 이 순간을 위해 있는 거예요", "발견 완료! 다음 곡 갈까요?"],
};

function pickLine(mood: NexiMood, seed: number): string {
  const lines = MOOD_LINES[mood];
  return lines[seed % lines.length];
}

export function NexiCompanion({ mood = "idle" }: { mood?: NexiMood }) {
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [line, setLine] = useState(() => pickLine(mood, 0));
  const seedRef = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    seedRef.current += 1;
    setLine(pickLine(mood, seedRef.current));
    setBubbleVisible(true);

    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setBubbleVisible(false), 3600);

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [mood]);

  const excited = mood === "excited";

  return (
    <div className="nexi-companion">
      <AnimatePresence>
        {bubbleVisible && (
          <motion.div
            key={line}
            className="nexi-speech-bubble"
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {line}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        className="nexi-companion-avatar"
        aria-label="NEXI"
        onClick={() => {
          seedRef.current += 1;
          setLine(pickLine(mood, seedRef.current));
          setBubbleVisible(true);
          if (hideTimer.current) clearTimeout(hideTimer.current);
          hideTimer.current = setTimeout(() => setBubbleVisible(false), 3600);
        }}
        initial={{ opacity: 0, scale: 0.6, y: 24 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: [0, -6, 0],
          rotate: excited ? [0, -6, 6, -4, 4, 0] : 0,
        }}
        transition={{
          y: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 0.6, repeat: excited ? Infinity : 0, repeatDelay: 0.4 },
          default: { duration: 0.35, ease: "easeOut" },
        }}
      >
        <img
          src="/nexi/nexi-front.png"
          alt="NEXI"
          className="nexi-companion-img"
          draggable={false}
        />
      </motion.button>
    </div>
  );
}
