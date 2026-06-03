import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Copy, UserPlus } from "lucide-react";
import { Link, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { getGoogleOAuthUrl } from "@/lib/loginRedirect";
import { inAppBrowserLabel, isLikelyInAppBrowser } from "@/lib/inapp-browser";

export default function Auth() {
  const { t } = useTranslation();
  const search = useSearch();
  const [copied, setCopied] = useState(false);
  const oauthHref = useMemo(() => {
    const params = new URLSearchParams(search);
    const rt = params.get("returnTo");
    return getGoogleOAuthUrl(rt ?? undefined);
  }, [search]);
  const inApp = useMemo(() => isLikelyInAppBrowser(), []);
  const appLabel = useMemo(() => inAppBrowserLabel(), [inApp]);

  const copyCurrentUrl = async () => {
    try {
      const fallback = typeof window !== "undefined" ? window.location.href : oauthHref;
      await navigator.clipboard.writeText(fallback);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto py-20 px-4 text-center space-y-8"
    >
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary">NEX</p>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-white uppercase tracking-tight">
          {t("auth.title")}
        </h1>
        <p className="text-sm text-zinc-500 leading-relaxed">{t("auth.subtitle")}</p>
      </div>
      {inApp && (
        <div
          className="text-left border border-amber-500/30 bg-amber-500/10 rounded-sm p-4 space-y-3"
          data-testid="notice-inapp-login-warning"
        >
          <div className="flex items-center gap-2 text-amber-300">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-[11px] font-bold uppercase tracking-widest">
              {appLabel ? t("auth.inAppTitleWithApp", { app: appLabel }) : t("auth.inAppTitleGeneric")}
            </p>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">{t("auth.inAppBody")}</p>
          <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line">{t("auth.inAppSteps")}</p>
          <button
            type="button"
            onClick={() => void copyCurrentUrl()}
            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border border-amber-300/40 text-amber-200 px-3 py-2 rounded-sm hover:bg-amber-500/10 transition-all"
            data-testid="button-copy-auth-url"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? t("inAppBrowser.copied") : t("inAppBrowser.copyLink")}
          </button>
        </div>
      )}
      {inApp ? (
        <p
          className="text-[10px] text-zinc-500 uppercase tracking-widest max-w-sm mx-auto leading-relaxed"
          data-testid="text-auth-oauth-blocked"
        >
          {t("auth.inAppOAuthHint")}
        </p>
      ) : null}
      <a
        href={oauthHref}
        data-testid="button-auth-continue"
        aria-disabled={inApp}
        className={
          inApp
            ? "inline-flex items-center justify-center gap-2 w-full sm:w-auto min-w-[200px] bg-zinc-700 text-zinc-400 font-bold uppercase tracking-widest text-[11px] px-8 py-4 rounded-sm cursor-not-allowed pointer-events-none"
            : "inline-flex items-center justify-center gap-2 w-full sm:w-auto min-w-[200px] bg-primary text-black font-bold uppercase tracking-widest text-[11px] px-8 py-4 rounded-sm hover:brightness-110 transition-all"
        }
        onClick={inApp ? (e) => e.preventDefault() : undefined}
      >
        <UserPlus className="w-4 h-4" />
        {t("auth.continueGoogle")}
      </a>
      <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
        <Link href="/" className="hover:text-primary transition-colors">
          {t("auth.backHome")}
        </Link>
      </p>
    </motion.div>
  );
}
