export function isLikelyInAppBrowser(userAgentRaw?: string): boolean {
  const ua = (userAgentRaw ?? (typeof navigator !== "undefined" ? navigator.userAgent : "")).toLowerCase();
  if (!ua) return false;

  // Common app webviews that often fail Google OAuth ("disallowed_useragent").
  const appMarkers = [
    "kakaotalk",
    "instagram",
    "fb_iab",
    "fbav",
    "line/",
    "naver",
    "daumapps",
    "wv", // Android WebView
  ];

  return appMarkers.some((m) => ua.includes(m));
}

