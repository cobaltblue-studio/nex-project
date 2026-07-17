import { motion, AnimatePresence } from "framer-motion";

/** Base NEXI character art (confirmed front-facing pose). Reused across all appearances for now. */
const NEXI_IMG = "/nexi/nexi-front.png";

export const NEXI_TRACK_A_LINES = [
  "오, 이 트랙 분위기 있는데?",
  "잘 들어봐, 놓치면 후회함!",
  "귀 기울여봐 \uD83D\uDC40",
  "첫 곡부터 심상치 않네...",
];

export const NEXI_TRACK_B_LINES = [
  "두 번째 트랙도 만만치 않은데?",
  "오, 이건 또 다른 느낌!",
  "비교해볼까? \uD83C\uDFA7",
  "긴장되는데 이거?",
];

interface NexiPeekProps {
  active: boolean;
  side: "left" | "right";
  message: string;
}

/** NEXI peeking in from the edge of the battle stage with a one-line speech bubble. */
export function NexiPeek({ active, side, message }: NexiPeekProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key={`${side}-${message}`}
          className={`nexi-peek-layer nexi-peek-${side}`}
          initial={{ x: side === "right" ? 70 : -70, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: side === "right" ? 70 : -70, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          aria-hidden
        >
          <div className="nexi-speech-bubble">{message}</div>
          <img src={NEXI_IMG} alt="" className="nexi-peek-img" draggable={false} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Small dancing NEXI + thumbs up, meant to sit inline next to the winning percentage. */
export function NexiVictoryDance() {
  return (
    <motion.span
      className="nexi-victory-dance"
      initial={{ opacity: 0, scale: 0.4, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 16 }}
    >
      <motion.img
        src={NEXI_IMG}
        alt="NEXI"
        className="nexi-dance-img"
        draggable={false}
        animate={{ rotate: [0, -14, 14, -14, 14, 0], y: [0, -6, 0, -6, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="nexi-thumbs-up" aria-hidden>
        👍
      </span>
    </motion.span>
  );
}
