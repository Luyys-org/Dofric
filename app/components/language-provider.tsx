"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";

import {
  type Language,
  type TranslationKey,
  translationPipe,
} from "@/lib/i18n";
import { createBrowserStorage, useBrowserStorage } from "@/lib/storage";

const languageStorage = createBrowserStorage<Language>("dofric:language", "en", {
  codec: {
    parse: (raw) => (JSON.parse(raw) === "fr" ? "fr" : "en"),
    stringify: JSON.stringify,
  },
});

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/** Provides the persisted UI language and the shared translation pipe. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { value: language, setValue: setLanguage } = useBrowserStorage(languageStorage);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: (key, values) => translationPipe(language, key, values) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider.");
  return context;
}