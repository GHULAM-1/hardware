"use client";

import * as React from "react";
import { I18nextProvider } from "react-i18next";

import { Language } from "@/lib/enums";
import { STORAGE_KEY, initI18n, isRtl } from "@/i18n/config";

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  dir: "rtl" | "ltr";
};

const LanguageContext = React.createContext<LanguageContextValue | null>(null);

export function useLanguage(): LanguageContextValue {
  const ctx = React.useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within I18nProvider");
  return ctx;
}

function readStoredLanguage(): Language {
  if (typeof window === "undefined") return Language.English;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === Language.Urdu ? Language.Urdu : Language.English;
}

function applyDocumentLanguage(lang: Language) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
  document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Lazy init so the first render already matches the inline-script-set <html dir>.
  const [language, setLanguageState] = React.useState<Language>(readStoredLanguage);
  const i18n = React.useMemo(() => initI18n(language), [language]);

  const setLanguage = React.useCallback(
    (lang: Language) => {
      setLanguageState(lang);
      void i18n.changeLanguage(lang);
      window.localStorage.setItem(STORAGE_KEY, lang);
      applyDocumentLanguage(lang);
    },
    [i18n],
  );

  // Keep <html lang/dir> in sync on mount and whenever language changes.
  React.useEffect(() => {
    void i18n.changeLanguage(language);
    applyDocumentLanguage(language);
  }, [i18n, language]);

  const value = React.useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, dir: isRtl(language) ? "rtl" : "ltr" }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </LanguageContext.Provider>
  );
}
