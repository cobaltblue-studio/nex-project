import { useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

type Props = {
  url: string;
  text: string;
  compact?: boolean;
  testIdPrefix?: string;
};

export function ShareButtons({ url, text, compact, testIdPrefix = "share" }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: t("share.linkCopiedTitle"), description: t("share.linkCopiedDesc") });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: t("share.copyFailedTitle"),
        description: url,
        variant: "destructive",
      });
    }
  };

  const nativeShare = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "NEX", text, url });
        return;
      } catch (e: unknown) {
        if ((e as Error)?.name === "AbortError") return;
      }
    }
    await copyLink();
  };

  const openX = () => {
    const share = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(share, "_blank", "noopener,noreferrer,width=550,height=420");
  };

  const btn =
    "font-bold uppercase tracking-widest border rounded-sm transition-all disabled:opacity-40";
  const size = compact
    ? `${btn} text-[8px] px-2 py-1 border-white/15 text-zinc-400 hover:text-primary hover:border-primary/40 bg-black/30`
    : `${btn} text-[9px] px-3 py-2 border-white/15 text-zinc-300 hover:text-primary hover:border-primary/40 bg-black/20`;

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${compact ? "" : "gap-3"}`}>
      <button
        type="button"
        onClick={() => void nativeShare()}
        className={size}
        data-testid={`button-${testIdPrefix}-native`}
      >
        <Share2 className={`inline ${compact ? "w-3 h-3" : "w-3.5 h-3.5"} mr-1`} />
        {t("share.share")}
      </button>
      <button
        type="button"
        onClick={() => void copyLink()}
        className={size}
        data-testid={`button-${testIdPrefix}-copy`}
      >
        <Copy className={`inline ${compact ? "w-3 h-3" : "w-3.5 h-3.5"} mr-1`} />
        {copied ? t("share.copied") : t("share.copyLink")}
      </button>
      <button
        type="button"
        onClick={openX}
        className={size}
        data-testid={`button-${testIdPrefix}-x`}
      >
        {t("share.postOnX")}
      </button>
    </div>
  );
}
