// qup-pulse-admin/src/context/LandingLang.js
'use client';
// Language provider for the landing page. Mirrors the app/dashboard i18n shape:
// useLang() returns { lang, setLang, t }, where `t` is a plain object accessed
// as t.hero.title. Defaults to English; persists the user's choice in
// localStorage; exposes SUPPORTED_LANGS for the switcher.
//
// LANG_PERSIST_V1 — setLang also writes User.language via the profile endpoint.
// Without this the switcher only changed the browser's copy: the profile page
// reads `profile.language` off the API record, so a user who picked Norwegian
// still saw "App language: English" on their own profile, and so did everyone
// viewing it. localStorage remains the source of truth for what's rendered
// (instant, works signed-out); the PATCH is a best-effort sync of the stored
// preference. A failure is swallowed — the UI must not get stuck because the
// network hiccuped, and the next switch retries anyway.
import { createContext, useContext, useEffect, useState } from 'react';
import {
  getTranslations,
  SUPPORTED_LANGS,
  DEFAULT_LANG,
} from '../content/landingContent';
// quppulse/src/context/LandingLang.js
import { persistLanguage } from '../lib/profileSettingsApi';

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

  // quppulse/src/context/LandingLang.js
  const setLang = (next) => {
    if (!SUPPORTED_LANGS.includes(next)) return;
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    // Persist to the profile when signed in. Fire-and-forget: a logged-out
    // visitor gets a 401 here, which is expected and not worth surfacing.
    if (window.localStorage.getItem('qup_pulse_admin_jwt')) {
      persistLanguage(next).catch(() => { });
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