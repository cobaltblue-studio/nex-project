import { motion, AnimatePresence } from "framer-motion";

const NEXI_FRONT_IMG = "/nexi/nexi-front.png";
/** Dedicated peeking-around-the-edge poses (not mirrored, so the NEXI wordmark stays readable). */
const NEXI_PEEK_IMG: Record<"left" | "right", string> = {
  left: "/nexi/nexi-peek-left.png",
  right: "/nexi/nexi-peek-right.png",
};

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

/** NEXI popping up from behind the battle frame's edge, gripping it, with an idle wobble so it feels alive. */
export function NexiPeek({ active, side, message }: NexiPeekProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key={`${side}-${message}`}
          className={`nexi-peek-layer nexi-peek-${side}`}
          initial={{ y: 46, opacity: 0, rotate: side === "right" ? 8 : -8 }}
          animate={{
            y: [46, -6, 0, -4, 0],
            opacity: 1,
            rotate: [side === "right" ? 8 : -8, 0, -3, 2, 0],
          }}
          exit={{ y: 46, opacity: 0, transition: { duration: 0.22, ease: "easeIn" } }}
          transition={{
            y: { duration: 0.9, times: [0, 0.45, 0.65, 0.85, 1], ease: "easeOut" },
            rotate: { duration: 1.6, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
            opacity: { duration: 0.25 },
          }}
          aria-hidden
        >
          <div className="nexi-speech-bubble">{message}</div>
          <img
            src={NEXI_PEEK_IMG[side]}
            alt=""
            className="nexi-peek-img"
            draggable={false}
          />
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
        src={NEXI_FRONT_IMG}
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
