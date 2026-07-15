// qup-pulse-admin/src/components/LegalHeader.js
'use client';

// Minimal header for legal pages: wordmark + theme toggle + language switcher.
// Wordmark stays literal (brand); controls carry localized aria-labels.
//
// useDarkMode() is here for two reasons: the toggle, and the side effect. The
// hook is what applies the `dark` class to <html>, and nothing else on these
// routes calls it — so without this the legal pages rendered light regardless
// of the stored preference, while the rest of the app was dark.

import Link from 'next/link';
import { useLang } from '../context/LandingLang';
import { useDarkMode } from '../lib/useDarkMode';
import { LANGUAGES, SUPPORTED_LANGS } from '../content/landingContent';

export default function LegalHeader() {
  const { lang, setLang, t } = useLang();
  const { dark, toggle } = useDarkMode();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-[#0b1016]/90">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight no-underline text-slate-900 dark:text-white">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Qup Pulse
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={dark ? t.nav.switchToLight : t.nav.switchToDark}
            className="grid h-[34px] w-[34px] place-items-center rounded-lg border border-slate-300 text-base transition hover:border-emerald-400 dark:border-slate-700"
          >
            {dark ? '🌙' : '☀️'}
          </button>
          <select
            aria-label={t.nav.language}
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            {SUPPORTED_LANGS.map((c) => <option key={c} value={c}>{LANGUAGES[c]}</option>)}
          </select>
        </div>
      </div>
    </header>
  );
}