// quppulse/src/context/LandingLang.js
'use client';

// Language provider for the landing page. Mirrors the app/dashboard i18n shape:
// useLang() returns { lang, setLang, t }, where `t` is a plain object accessed
// as t.hero.title. Defaults to English; persists the user's choice in
// localStorage; exposes SUPPORTED_LANGS for the switcher.
//
// If quppulse.com already has a site-wide LangProvider, you can delete this and
// point page.js's import at that instead — just keep the same { lang, setLang, t }
// contract and feed it landingContent's getTranslations().

import { createContext, useContext, useEffect, useState } from 'react';
import {
  getTranslations,
  SUPPORTED_LANGS,
  DEFAULT_LANG,
} from '../content/landingContent';

const STORAGE_KEY = 'quppulse_lang';

const LandingLangContext = createContext(null);

export function LandingLangProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LANG);

  // On mount: use stored choice if valid, else keep English default.
  // (We intentionally default to English rather than auto-detecting browser
  // language — the visitor can switch, and English is the display default.)
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED_LANGS.includes(stored)) {
        setLangState(stored);
      }
    } catch {
      /* localStorage unavailable — stay on default */
    }
  }, []);

  const setLang = (next) => {
    if (!SUPPORTED_LANGS.includes(next)) return;
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const t = getTranslations(lang);

  return (
    <LandingLangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LandingLangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LandingLangContext);
  if (!ctx) throw new Error('useLang must be used inside <LandingLangProvider>');
  return ctx;
}