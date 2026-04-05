/**
 * Uniform bilingual copy for JSON API `message` fields shown in clients.
 * Format: [한글 설명] (English description)
 */
export function apiMsg(ko: string, en: string): string {
  return `[${ko}] (${en})`;
}
