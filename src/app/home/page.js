// qup-pulse-admin/src/app/home/page.js
'use client';

// Shared home page — everyone lands here after logging in.
// If the signed-in user's role is 'admin', an extra "Moderation" link to
// /reports is shown. Regular users don't see it.
//
// This link is UX only. The real protection is server-side: every /admin/*
// route runs requireAuth + requireAdmin, which re-checks role === 'admin'
// against the database. A non-admin who reaches /reports directly gets 403.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, getRole, clearToken, isAdmin } from '../../lib/api';

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/');
      return;
    }
    setAdmin(isAdmin());
    setReady(true);
  }, [router]);

  function signOut() {
    clearToken();
    router.replace('/');
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-500 dark:bg-[#0b1016] dark:text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-100">
      <nav className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Qup Pulse
          </div>
          <button
            onClick={signOut}
            className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-sm transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Welcome to Qup Pulse</h1>
        <p className="mb-8 text-slate-600 dark:text-slate-400">
          You're signed in. This is your home.
        </p>

        {admin ? (
          <div className="rounded-2xl border border-emerald-400/35 bg-emerald-400/10 p-6">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-950">
                Admin
              </span>
              <h2 className="text-lg font-semibold">Moderation tools</h2>
            </div>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
              You have administrator access. Review reports, manage users, and
              moderate posts.
            </p>
            <Link
              href="/reports"
              className="inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:brightness-105"
            >
              Open moderation dashboard
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#131c26]">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Your account is active. Enjoy Qup Pulse.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}