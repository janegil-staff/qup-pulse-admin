// qup-pulse-admin/src/app/verifyLP/VerifyClient.js
'use client';

// Calls GET /api/auth/verify/:token through the Next rewrite proxy
// (next.config.mjs), so there's no CORS and the API host never shows up in the
// browser. Works signed-out: the token itself identifies the user.
//
// Only res.ok matters. On success the API returns JSON; on an invalid or
// expired token it returns 400 (currently with an HTML body). We never parse
// the body, so either shape works.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLang } from '../../context/LandingLang';
import LegalHeader from '../../components/LegalHeader';
import { getToken } from '../../lib/api.js';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function VerifyClient({ token }) {
  const { t } = useLang();
  const v = t.verify;
  // 'checking' | 'success' | 'expired' | 'error'
  const [status, setStatus] = useState(token ? 'checking' : 'expired');
  const [signedIn, setSignedIn] = useState(false);
  // StrictMode runs effects twice in dev. The token is single-use, so a second
  // call would 400 and flip a real success to "expired".
  const ran = useRef(false);

  useEffect(() => {
    setSignedIn(Boolean(getToken()));
    if (!token || ran.current) return;
    ran.current = true;

    fetch(`${API_URL}/auth/verify/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then((res) => {
        if (res.ok) setStatus('success');
        else if (res.status === 400 || res.status === 404) setStatus('expired');
        else setStatus('error');
      })
      .catch(() => setStatus('error'));
  }, [token]);

  const content = {
    checking: { title: v.checking, body: null, icon: '…', tone: 'text-slate-400' },
    success: { title: v.successTitle, body: v.successBody, icon: '✓', tone: 'text-emerald-400' },
    expired: { title: v.expiredTitle, body: v.expiredBody, icon: '!', tone: 'text-amber-400' },
    error: { title: v.errorTitle, body: v.errorBody, icon: '×', tone: 'text-rose-400' },
  }[status];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-200">
      <LegalHeader />
      <div className="mx-auto flex max-w-md flex-col items-center px-6 pb-24 pt-24 text-center">
        <div
          className={`mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 text-2xl font-bold dark:border-slate-800 ${content.tone}`}
          aria-hidden="true"
        >
          {content.icon}
        </div>
        <h1 className="mb-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white" aria-live="polite">
          {content.title}
        </h1>
        {content.body && (
          <p className="mb-8 text-base leading-relaxed text-slate-600 dark:text-slate-400">{content.body}</p>
        )}

        {status !== 'checking' && (
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={signedIn ? '/profile' : '/login'}
              className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white no-underline transition hover:bg-emerald-600"
            >
              {signedIn ? v.goProfile : v.openApp}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
