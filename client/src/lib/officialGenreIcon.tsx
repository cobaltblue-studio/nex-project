import type { LucideIcon } from "lucide-react";
import { Mic2, Zap, Guitar, Headphones, Disc, Coffee, Music } from "lucide-react";

/** NEX 공식 6개 장르 이름과 100% 일치할 때만 전용 아이콘, 그 외 Music */
const OFFICIAL_GENRE_ICONS: Record<string, LucideIcon> = {
  Pop: Mic2,
  Dance: Zap,
  Rock: Guitar,
  "Hip-Hop & Rap": Headphones,
  Funk: Disc,
  "Lo-Fi & Chill": Coffee,
};

export function getOfficialGenreIcon(genre: string): LucideIcon {
  return OFFICIAL_GENRE_ICONS[genre] ?? Music;
}
