import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { Language } from "@/lib/enums";
import en from "./en.json";
import ur from "./ur.json";

export const STORAGE_KEY = "lang";
export const RTL_LANGUAGES: Language[] = [Language.Urdu];

export function isRtl(lang: string): boolean {
  return RTL_LANGUAGES.includes(lang as Language);
}

/** Initialize once (client-side). Safe to call repeatedly. */
export function initI18n(initialLang: Language = Language.English) {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources: {
        en: { translation: en },
        ur: { translation: ur },
      },
      lng: initialLang,
      fallbackLng: Language.English,
      interpolation: { escapeValue: false },
      returnNull: false,
    });
  } else {
    // Keep bundles fresh so newly added keys appear (and dev HMR picks up edits).
    i18n.addResourceBundle("en", "translation", en, true, true);
    i18n.addResourceBundle("ur", "translation", ur, true, true);
  }
  return i18n;
}

export default i18n;
