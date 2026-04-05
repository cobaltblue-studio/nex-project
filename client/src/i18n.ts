import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en/translation.json";
import ko from "./locales/ko/translation.json";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ko: { translation: ko },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "ko"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "nex_lang",
    },
  });

function applyDocumentLang(lng: string) {
  const short = lng.split("-")[0];
  document.documentElement.lang = short === "ko" ? "ko" : "en";
}
applyDocumentLang(i18n.resolvedLanguage ?? "en");
i18n.on("languageChanged", applyDocumentLang);

export default i18n;
