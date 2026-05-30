export function isLikelyInAppBrowser(userAgentRaw?: string): boolean {
  const ua = (userAgentRaw ?? (typeof navigator !== "undefined" ? navigator.userAgent : "")).toLowerCase();
  if (!ua) return false;

  // App webviews that often fail Google OAuth (403 disallowed_useragent).
  const appMarkers = [
    "kakaotalk",
    "instagram",
    "threads",
    "barcelona", // Meta Threads internal UA on some builds
    "fb_iab",
    "fbav",
    "fban",
    "facebook",
    "line/",
    "naver",
    "daumapps",
    "tiktok",
    "musical_ly",
    "snapchat",
    "twitter",
    "linkedinapp",
    "; wv",
    "webview",
  ];

  if (appMarkers.some((m) => ua.includes(m))) return true;

  // iOS embedded WebView: AppleWebKit without a full browser token (Safari, CriOS, etc.)
  if (/iphone|ipad|ipod/.test(ua) && /applewebkit/.test(ua) && !/safari|crios|fxios|edgios|opios/.test(ua)) {
    return true;
  }

  return false;
}

/** Human-readable hint for the detected in-app browser (for login banners). */
export function inAppBrowserLabel(userAgentRaw?: string): string | null {
  const ua = (userAgentRaw ?? (typeof navigator !== "undefined" ? navigator.userAgent : "")).toLowerCase();
  if (!ua) return null;
  if (ua.includes("threads") || ua.includes("barcelona")) return "Threads";
  if (ua.includes("instagram")) return "Instagram";
  if (ua.includes("kakaotalk")) return "KakaoTalk";
  if (ua.includes("fb") || ua.includes("facebook")) return "Facebook";
  if (ua.includes("tiktok") || ua.includes("musical_ly")) return "TikTok";
  if (isLikelyInAppBrowser(ua)) return "this app";
  return null;
}

