/**
 * Home weekly atmosphere backgrounds (KST weekday).
 * Files: /backgrounds/nex-home-week-{1..7}.{webp,jpg}
 * 1=Mon … 7=Sun
 */

export type HomeWeekBg = {
  /** 1–7 Mon–Sun (KST) */
  day: number;
  id: string;
  webp: string;
  jpg: string;
  label: string;
};

export const HOME_WEEK_BACKGROUNDS: HomeWeekBg[] = [
  {
    day: 1,
    id: "moonlit-flowers",
    webp: "/backgrounds/nex-home-week-1.webp",
    jpg: "/backgrounds/nex-home-week-1.jpg",
    label: "Moonlit Flowers",
  },
  {
    day: 2,
    id: "purple-dream",
    webp: "/backgrounds/nex-home-week-2.webp",
    jpg: "/backgrounds/nex-home-week-2.jpg",
    label: "Purple Dream",
  },
  {
    day: 3,
    id: "moon-cottage",
    webp: "/backgrounds/nex-home-week-3.webp",
    jpg: "/backgrounds/nex-home-week-3.jpg",
    label: "Moon Cottage",
  },
  {
    day: 4,
    id: "neon-city",
    webp: "/backgrounds/nex-home-week-4.webp",
    jpg: "/backgrounds/nex-home-week-4.jpg",
    label: "Neon City",
  },
  {
    day: 5,
    id: "glow-forest",
    webp: "/backgrounds/nex-home-week-5.webp",
    jpg: "/backgrounds/nex-home-week-5.jpg",
    label: "Glow Forest",
  },
  {
    day: 6,
    id: "aurora-monolith",
    webp: "/backgrounds/nex-home-week-6.webp",
    jpg: "/backgrounds/nex-home-week-6.jpg",
    label: "Aurora Monolith",
  },
  {
    day: 7,
    id: "planet-valley",
    webp: "/backgrounds/nex-home-week-7.webp",
    jpg: "/backgrounds/nex-home-week-7.jpg",
    label: "Planet Valley",
  },
];

/** KST weekday → 1=Mon … 7=Sun */
export function kstWeekdayMon1(now: Date = new Date()): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  }).format(now);
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[wd] ?? 1;
}

/**
 * Resolve today's Home background.
 * Preview: `?homeBg=1` … `7` (or id slug).
 */
export function resolveHomeWeekBackground(now: Date = new Date()): HomeWeekBg {
  let day = kstWeekdayMon1(now);
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search).get("homeBg");
    if (q) {
      const asNum = Number(q);
      if (Number.isFinite(asNum) && asNum >= 1 && asNum <= 7) {
        day = Math.floor(asNum);
      } else {
        const byId = HOME_WEEK_BACKGROUNDS.find((b) => b.id === q.trim().toLowerCase());
        if (byId) day = byId.day;
      }
    }
  }
  return HOME_WEEK_BACKGROUNDS.find((b) => b.day === day) ?? HOME_WEEK_BACKGROUNDS[0];
}
