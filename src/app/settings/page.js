// qup-pulse-admin/src/app/settings/page.js
'use client';

// Settings — web version of the app's Innstillinger screen.
// LOGGED-IN ONLY (redirects to / without a token).
// Fully localized via useLang() (t.app.settings.* / t.app.nav.*).
// Theme is toggled from AppNav; no appearance controls here.
//
// Light-mode contrast matches settings/personal: cards use border-slate-300 +
// shadow-sm against bg-slate-50, row dividers use slate-200. Dark mode untouched.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, clearToken } from '../../lib/api';
import { useLang } from '../../context/LandingLang';
import AppNav from '../../components/AppNav';

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useLang();
  const s = t.app.settings;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) { router.replace('/'); return; }
    setReady(true);
  }, [router]);

  function logOut() {
    clearToken();
    router.replace('/');
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-500 dark:bg-[#0b1016] dark:text-slate-400">
        {s.loading}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-100">
      <AppNav />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{s.settingsTitle}</h1>

        {/* Personal settings */}
        <Card>
          <RowLink href="/settings/personal" label={s.title} />
        </Card>

        {/* Privacy & security */}
        <SectionTitle>{s.privacySecurity}</SectionTitle>
        <Card>
          <RowDisabled label={s.blockedUsers} soon={t.app.nav.soon} />
        </Card>

        {/* Legal */}
        <SectionTitle>{s.legal}</SectionTitle>
        <Card>
          <RowLink href="/terms" label={s.termsOfUse} external />
          <RowLink href="/privacy" label={s.privacyPolicy} external last />
        </Card>

        {/* Account actions */}
        <div className="mt-6" />
        <Card>
          <RowButton label={s.logOut} onClick={logOut} />
          <RowLink href="/delete" label={s.deleteAccount} danger last />
        </Card>

        <p className="mt-8 text-center text-sm text-slate-400 dark:text-slate-600">Qup Pulse</p>
      </main>
    </div>
  );
}

/* ---------- building blocks ---------- */

function Card({ children }) {
  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm dark:border-slate-800 dark:bg-[#131c26] dark:shadow-none">
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <p className="mb-2 mt-6 px-1 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
      {children}
    </p>
  );
}

const rowBase =
  'flex items-center justify-between gap-3 px-5 py-4 text-[15px] border-b border-slate-200 last:border-0 dark:border-slate-800';

function RowLink({ href, label, external, danger, last }) {
  const cls = `${rowBase} ${last ? 'border-0' : ''} transition hover:bg-slate-50 dark:hover:bg-slate-800/50`;
  const text = danger ? 'font-semibold text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100';
  const inner = (
    <>
      <span className={text}>{label}</span>
      <span className="text-slate-400">›</span>
    </>
  );
  if (external) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>;
  }
  return <Link href={href} className={cls}>{inner}</Link>;
}

function RowButton({ label, onClick, last }) {
  return (
    <button
      onClick={onClick}
      className={`${rowBase} ${last ? 'border-0' : ''} w-full text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50`}
    >
      <span className="text-slate-900 dark:text-slate-100">{label}</span>
      <span className="text-slate-400">›</span>
    </button>
  );
}

function RowDisabled({ label, soon }) {
  return (
    <div className={`${rowBase} border-0 cursor-default`}>
      <span className="text-slate-400 dark:text-slate-600">{label}</span>
      <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        {soon}
      </span>
    </div>
  );
}