/**
 * Copy a single PNG to the clipboard. KakaoTalk (and macOS pasteboard) may insert
 * duplicate images if the board holds multiple representations (PNG + TIFF, etc.)
 * from Finder/Preview copy — use this instead of copying a saved file.
 */
export async function copyImageToClipboard(blob: Blob): Promise<void> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("CLIPBOARD_UNAVAILABLE");
  }
  const png = blob.type === "image/png" ? blob : new Blob([blob], { type: "image/png" });
  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": Promise.resolve(png),
    }),
  ]);
}
