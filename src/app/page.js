// quppulse/src/app/page.js
'use client';

// Qup Pulse landing page (root route of quppulse.com).
// Tailwind CSS — matches the admin dashboard's slate + emerald palette.
// Dark/light via the `dark` class on the root container (Tailwind darkMode:'class').
// i18n via useLang() — `t` is a plain object (t.hero.title). Defaults to English;
// language switcher in the nav.
//
// Requires darkMode: 'class' in tailwind.config (Tailwind's default-off setting).
// The one custom bit — the pulse ripple animation — uses an inline <style> tag
// scoped to this page, so no tailwind.config keyframes are needed.
//
// The waitlist form POSTs to /api/waitlist — wire that route to your API or a
// Resend audience. Until then it validates and shows the success state.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '../context/LandingLang';
import { LANGUAGES, SUPPORTED_LANGS } from '../content/landingContent';
import { adminApi, setToken, setRole } from '../lib/api';

export default function LandingPage() {
  const { t, lang, setLang } = useLang();
  const router = useRouter();
  const [dark, setDark] = useState(true);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const prefersLight =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: light)').matches;
    setDark(!prefersLight);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !/^\d{4}$/.test(pin)) {
      setError(t.login.invalid);
      return;
    }
    setLoading(true);
    try {
      // Everyone logs in the same way — no admin gate. Regular users log in
      // fine; the admin link is shown later only if role === 'admin'.
      const { token, user } = await adminApi.login(email.trim().toLowerCase(), pin);
      setToken(token);
      setRole(user?.role || 'user');
      router.replace('/home');
    } catch (err) {
      setToken(null);
      setRole(null);
      setError(err.message || t.login.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={dark ? 'dark' : ''}>
      <style>{`
        @keyframes qp-ripple {
          0% { width: 120px; height: 120px; opacity: 0.9; }
          100% { width: 820px; height: 820px; opacity: 0; }
        }
        @keyframes qp-navpulse {
          0% { box-shadow: 0 0 0 0 rgba(52,211,153,0.35); }
          70% { box-shadow: 0 0 0 8px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
        .qp-ring { animation: qp-ripple 4s ease-out infinite; }
        .qp-ring:nth-child(2) { animation-delay: 1s; }
        .qp-ring:nth-child(3) { animation-delay: 2s; }
        .qp-ring:nth-child(4) { animation-delay: 3s; }
        .qp-dot { animation: qp-navpulse 2.4s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .qp-ring, .qp-dot { animation: none; }
          .qp-ring:first-child { opacity: 0.35; width: 520px; height: 520px; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-50 text-slate-900 antialiased transition-colors dark:bg-[#0b1016] dark:text-slate-100">
        {/* Nav */}
        <nav className="sticky top-0 z-50 border-b border-slate-200 bg-slate-50/80 backdrop-blur-md dark:border-slate-800 dark:bg-[#0b1016]/80">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
            <div className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
              <span className="qp-dot h-2.5 w-2.5 rounded-full bg-emerald-400" /> Qup Pulse
            </div>
            <div className="flex items-center gap-2">
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                aria-label="Language"
                className="rounded-lg border border-slate-300 bg-transparent px-2.5 py-2 text-[13px] text-slate-900 dark:border-slate-700 dark:text-slate-100"
              >
                {SUPPORTED_LANGS.map((code) => (
                  <option key={code} value={code} className="text-slate-900">
                    {LANGUAGES[code]}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setDark((d) => !d)}
                aria-label={t.nav.toggleTheme}
                className="grid h-[38px] w-[38px] place-items-center rounded-lg border border-slate-300 text-base transition hover:border-emerald-400 dark:border-slate-700"
              >
                {dark ? '🌙' : '☀️'}
              </button>
              <button
                onClick={() => document.getElementById('emailInput')?.focus()}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:brightness-105"
              >
                {t.nav.login}
              </button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <header className="relative overflow-hidden px-6 pb-24 pt-28 text-center">
          <div className="pointer-events-none absolute left-1/2 top-[30%] h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(52,211,153,0.10),transparent_62%)]" />
          <div className="pointer-events-none absolute left-1/2 top-[42%] grid h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 place-items-center" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="qp-ring absolute h-[120px] w-[120px] rounded-full border border-emerald-400/35 opacity-0"
              />
            ))}
          </div>

          <div className="relative z-[1] mx-auto max-w-6xl">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/35 bg-emerald-400/10 px-3.5 py-1.5 text-[13px] font-medium text-emerald-500 dark:text-emerald-300">
              <span className="inline-block h-[7px] w-[7px] rounded-full bg-emerald-400" /> {t.hero.badge}
            </span>
            <h1 className="mx-auto mb-5 max-w-[14ch] text-[clamp(38px,6.4vw,68px)] font-bold leading-[1.03] tracking-tight">
              {t.hero.titleLead}{' '}
              <span className="text-emerald-500 dark:text-emerald-400">{t.hero.titleHighlight}</span>.
            </h1>
            <p className="mx-auto mb-9 max-w-[52ch] text-[clamp(16px,2.2vw,20px)] text-slate-600 dark:text-slate-400">
              {t.hero.subhead}
            </p>

            <form onSubmit={handleSubmit} noValidate className="mx-auto max-w-[380px] text-left">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t.login.email}
              </label>
              <input
                id="emailInput"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.login.emailPlaceholder}
                aria-label={t.login.email}
                className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-[#131c26]"
              />

              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t.login.pin}
              </label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                aria-label={t.login.pin}
                className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] tracking-[0.5em] outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-[#131c26]"
              />

              {error ? (
                <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-300">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-emerald-500 px-5 py-3 text-[15px] font-semibold text-emerald-950 transition hover:brightness-105 disabled:opacity-50"
              >
                {loading ? t.login.signingIn : t.login.signIn}
              </button>
              <p className="mt-4 text-center text-[13px] text-slate-500 dark:text-slate-400">
                New here?{' '}
                <a href="/register" className="font-semibold text-emerald-600 no-underline hover:underline dark:text-emerald-400">
                  Create an account
                </a>
              </p>
            </form>
          </div>
        </header>

        {/* Features */}
        <section className="px-6 py-10">
          <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
            <Feature icon={<PinIcon />} title={t.features.local.title} body={t.features.local.body} />
            <Feature icon={<BoltIcon />} title={t.features.now.title} body={t.features.now.body} />
            <Feature icon={<ShieldIcon />} title={t.features.safety.title} body={t.features.safety.body} />
          </div>
        </section>

        {/* Download */}
        <section className="px-6 pb-10 pt-16 text-center">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-3 text-[clamp(26px,4vw,36px)] font-bold tracking-tight">{t.download.title}</h2>
            <p className="mx-auto mb-8 max-w-[46ch] text-slate-600 dark:text-slate-400">{t.download.body}</p>
            <div className="flex flex-wrap justify-center gap-3.5">
              <StoreBadge soon={t.download.soon} small={t.download.appStoreSmall} big={t.download.appStoreBig} glyph="" />
              <StoreBadge soon={t.download.soon} small={t.download.playSmall} big={t.download.playBig} glyph="▶" />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 border-t border-slate-200 py-8 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6">
            <div className="flex items-center gap-2.5 text-base font-bold">
              <span className="qp-dot h-2.5 w-2.5 rounded-full bg-emerald-400" /> Qup Pulse
            </div>
            <div className="flex flex-wrap gap-5">
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="transition hover:text-emerald-500">{t.footer.privacy}</a>
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="transition hover:text-emerald-500">{t.footer.terms}</a>
              <a href="/child-safety" target="_blank" rel="noopener noreferrer" className="transition hover:text-emerald-500">{t.footer.childSafety}</a>
              <a href="/delete" target="_blank" rel="noopener noreferrer" className="transition hover:text-emerald-500">{t.footer.delete}</a>
            </div>
            <div>© 2026 Qup DA</div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Feature({ icon, title, body }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-emerald-400/35 dark:border-slate-800 dark:bg-[#131c26]">
      <div className="mb-4 grid h-[42px] w-[42px] place-items-center rounded-xl bg-emerald-400/10 text-emerald-500 dark:text-emerald-400" aria-hidden="true">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="text-[15px] text-slate-600 dark:text-slate-400">{body}</p>
    </div>
  );
}

function StoreBadge({ soon, small, big, glyph }) {
  return (
    <span className="relative inline-flex min-w-[190px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 text-left opacity-75 dark:border-slate-800 dark:bg-[#121a23]">
      <span className="absolute -top-2 right-2.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-950">
        {soon}
      </span>
      <span className="text-2xl leading-none" aria-hidden="true">{glyph}</span>
      <span>
        <span className="block text-[11px] text-slate-500 dark:text-slate-400">{small}</span>
        <span className="text-base font-semibold">{big}</span>
      </span>
    </span>
  );
}

function PinIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  );
}