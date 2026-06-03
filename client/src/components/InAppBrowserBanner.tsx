import { useMemo, useState } from "react";
import { AlertTriangle, Copy, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { inAppBrowserLabel, isLikelyInAppBrowser } from "@/lib/inapp-browser";

export function InAppBrowserBanner() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const inApp = useMemo(() => isLikelyInAppBrowser(), []);
  const appLabel = useMemo(() => inAppBrowserLabel(), [inApp]);

  if (!inApp || dismissed) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3"
      data-testid="banner-inapp-browser"
      role="status"
    >
      <div className="max-w-6xl mx-auto flex gap-3 items-start">
        <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" aria-hidden />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-200">
            {appLabel
              ? t("inAppBrowser.titleWithApp", { app: appLabel })
              : t("inAppBrowser.titleGeneric")}
          </p>
          <p className="text-xs text-zinc-300 leading-relaxed">{t("inAppBrowser.body")}</p>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-200 hover:text-amber-100 mt-1"
            data-testid="button-copy-page-link-banner"
          >
            <Copy className="w-3 h-3" />
            {copied ? t("inAppBrowser.copied") : t("inAppBrowser.copyLink")}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-zinc-500 hover:text-zinc-300 shrink-0 p-1"
          aria-label={t("common.dismiss")}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
