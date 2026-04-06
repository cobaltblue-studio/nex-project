import { useTranslation } from "react-i18next";
import { clsx } from "clsx";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const setLang = (lng: "ko" | "en") => {
    void i18n.changeLanguage(lng);
  };

  const current = i18n.resolvedLanguage?.startsWith("ko") ? "ko" : "en";

  return (
    <div
      className="flex items-center rounded-sm border border-white/10 bg-black/40 p-0.5 scale-90 sm:scale-100 origin-right"
      role="group"
      aria-label={t("lang.switchAria")}
    >
      <button
        type="button"
        onClick={() => setLang("ko")}
        className={clsx(
          "px-2 py-1 text-[9px] font-black uppercase tracking-widest transition-all rounded-sm min-w-[2.25rem]",
          current === "ko"
            ? "bg-[hsla(220,88%,48%,0.35)] text-white border border-[hsla(220,88%,55%,0.45)]"
            : "text-zinc-500 hover:text-zinc-300 border border-transparent",
        )}
        aria-pressed={current === "ko"}
      >
        {t("lang.ko")}
      </button>
      <span className="text-zinc-600 text-[8px] px-0.5 select-none" aria-hidden>
        |
      </span>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={clsx(
          "px-2 py-1 text-[9px] font-black uppercase tracking-widest transition-all rounded-sm min-w-[2.25rem]",
          current === "en"
            ? "bg-[hsla(220,88%,48%,0.35)] text-white border border-[hsla(220,88%,55%,0.45)]"
            : "text-zinc-500 hover:text-zinc-300 border border-transparent",
        )}
        aria-pressed={current === "en"}
      >
        {t("lang.en")}
      </button>
    </div>
  );
}
