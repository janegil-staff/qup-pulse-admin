// qup-pulse-admin/src/components/Footer.js
'use client';

// Shared site footer — rendered once in the root layout, so it appears on
// every page. Legal links open in a new tab. Fully localized via useLang()
// (t.footer.*). Wordmark and entity line stay literal (brand).

import { useLang } from '../context/LandingLang';

const LINKS = [
  { href: '/privacy', labelKey: 'privacy' },
  { href: '/terms', labelKey: 'terms' },
  { href: '/child-safety', labelKey: 'childSafety' },
  { href: '/delete', labelKey: 'delete' },
];

export default function Footer() {
  const { t } = useLang();
  return (
    <footer className="border-t border-slate-200 bg-white py-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-[#0b1016] dark:text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Qup Pulse
        </div>
        <div className="flex flex-wrap gap-5">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-emerald-500"
            >
              {t.footer[l.labelKey]}
            </a>
          ))}
        </div>
        <div>© 2026 Qup DA</div>
      </div>
    </footer>
  );
}