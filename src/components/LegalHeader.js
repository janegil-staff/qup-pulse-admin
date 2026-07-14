// qup-pulse-admin/src/components/LegalHeader.js
'use client';

// Shared header for the legal pages: Qup Pulse wordmark + language picker.
// Reads/sets language via the same useLang() provider the landing page uses,
// so a choice here persists (localStorage 'quppulse_lang') and applies
// everywhere. Emerald/dark theme, follows the site's light/dark toggle.

import Link from 'next/link';
import { useLang } from '../context/LandingLang';
import { LANGUAGES, SUPPORTED_LANGS } from '../content/landingContent';

export default function LegalHeader() {
  const { lang, setLang } = useLang();
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-[#0b1016]/90">
      <div className="mx-auto flex max-w-[760px] items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5 text-base font-bold tracking-tight text-slate-900 no-underline dark:text-white">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Qup Pulse
        </Link>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          aria-label="Language"
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 outline-none dark:border-slate-700 dark:bg-[#131c26] dark:text-slate-100"
        >
          {SUPPORTED_LANGS.map((code) => (
            <option key={code} value={code}>{LANGUAGES[code]}</option>
          ))}
        </select>
      </div>
    </header>
  );
}
