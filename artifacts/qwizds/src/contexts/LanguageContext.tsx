import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import en, { type Translations } from "@/i18n/locales/en";
import zh from "@/i18n/locales/zh";
import ar from "@/i18n/locales/ar";
import he from "@/i18n/locales/he";

export type Language = "en" | "zh" | "ar" | "he";
export const RTL_LANGUAGES: Language[] = ["ar", "he"];

const LOCALE_MAP: Record<Language, Translations> = { en, zh, ar, he };

export const LANGUAGE_LABELS: Record<Language, { label: string; nativeLabel: string; flag: string }> = {
  en: { label: "English",  nativeLabel: "English",  flag: "🇺🇸" },
  zh: { label: "Chinese",  nativeLabel: "中文",      flag: "🇨🇳" },
  ar: { label: "Arabic",   nativeLabel: "العربية",   flag: "🇸🇦" },
  he: { label: "Hebrew",   nativeLabel: "עברית",     flag: "🇮🇱" },
};

interface LanguageCtx {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageCtx>({
  language: "en",
  setLanguage: () => {},
  t: en,
  isRTL: false,
});

function applyDirection(lang: Language) {
  const isRTL = RTL_LANGUAGES.includes(lang);
  document.documentElement.setAttribute("dir", isRTL ? "rtl" : "ltr");
  document.documentElement.setAttribute("lang", lang);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("qwizds_lang") as Language | null;
    return stored && LOCALE_MAP[stored] ? stored : "en";
  });

  useEffect(() => {
    applyDirection(language);
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    localStorage.setItem("qwizds_lang", lang);
    setLanguageState(lang);
    applyDirection(lang);
  }, []);

  const t = LOCALE_MAP[language];
  const isRTL = RTL_LANGUAGES.includes(language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
