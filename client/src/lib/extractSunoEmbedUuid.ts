/** Pull canonical song UUID from a Suno iframe embed URL. */
export function extractSunoEmbedUuid(src: string | null | undefined): string | null {
  const m = src?.match(/suno\.com\/embed\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return m ? m[1].toLowerCase() : null;
}
