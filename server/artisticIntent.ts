/**
 * Validates "artistic intent & prompts" (aiPrompt) for spam while allowing
 * Suno/Udio-style tag paste and admin staff edits.
 */

/** Suno-style blocks: slash groups, comma tag chains, KR intent + EN tags, labeled sections. */
export function looksLikeStructuredAiMusicPrompt(input: string): boolean {
  const s = input.trim();
  if (s.length < 16) return false;

  const tokens = s.match(/[A-Za-z가-힣]{2,}/g) ?? [];
  if (tokens.length < 5) return false;

  const slashCount = (s.match(/\//g) ?? []).length;
  if (slashCount >= 2 && tokens.length >= 6) return true;

  if (/[가-힣]/.test(s) && /[A-Za-z]{3,}/.test(s) && tokens.length >= 4) return true;

  const commaCount = (s.match(/,/g) ?? []).length;
  if (commaCount >= 4 && tokens.length >= 8) return true;

  if (/\b(Vocal|Instruments|Style|Genre|Mood|BPM|Key):/i.test(s) && tokens.length >= 5) {
    return true;
  }

  return false;
}

export function looksLikeGibberish(input: string): boolean {
  const s = input.trim();
  if (!s) return true;
  if (looksLikeStructuredAiMusicPrompt(s)) return false;

  const compact = s.replace(/\s+/g, "");
  if (!compact) return true;

  const meaningfulTokenCount = (s.match(/[A-Za-z가-힣]{2,}/g) || []).length;

  if (/([A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ])\1{4,}/.test(compact)) return true;
  if (/^([ㄱ-ㅎㅏ-ㅣㅋㅋㅎ]+)$/.test(compact) && compact.length >= 5) return true;
  if (/^(?:[a-z]{2,4}){3,}$/i.test(compact) && !/[aeiou]/i.test(compact)) return true;

  // Rich tag/prompt paste: skip low unique-char ratio (Suno copy triggers this).
  if (meaningfulTokenCount >= 8) {
    if (s.length >= 20 && meaningfulTokenCount < 3) return true;
    return false;
  }

  const uniqueChars = new Set(compact.toLowerCase()).size;
  const uniqueRatio = uniqueChars / compact.length;
  if (compact.length >= 12 && uniqueRatio < 0.25) return true;
  if (s.length >= 20 && meaningfulTokenCount < 3) return true;
  return false;
}

/** True when the server should reject aiPrompt (400). Admins always pass. */
export function rejectArtisticIntent(input: string, opts?: { isAdmin?: boolean }): boolean {
  if (opts?.isAdmin) return false;
  return looksLikeGibberish(input);
}
