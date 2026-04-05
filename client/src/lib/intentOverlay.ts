export type IntentOverlayData = {
  promptRecipeText: string;
  showQualityWarning: boolean;
};

function compact(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function lowQuality(input: string): boolean {
  const s = compact(input);
  if (!s) return true;
  if (s.length < 24) return true;
  if (/([A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ])\1{4,}/.test(s)) return true;
  const noSpace = s.replace(/\s+/g, "");
  if (noSpace.length >= 12) {
    const unique = new Set(noSpace.toLowerCase()).size;
    if (unique / noSpace.length < 0.28) return true;
  }
  return false;
}

export function buildIntentOverlay(aiPrompt: string | null | undefined): IntentOverlayData {
  const raw = compact(aiPrompt ?? "");
  if (!raw) {
    return { promptRecipeText: "", showQualityWarning: true };
  }
  const promptRecipeText = raw;
  return {
    promptRecipeText,
    showQualityWarning: lowQuality(promptRecipeText),
  };
}
