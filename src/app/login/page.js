// qup-pulse-admin/src/app/login/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, setToken, AuthError } from '../../lib/api.js';
import { useLang } from '../../context/LandingLang';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !/^\d{4}$/.test(pin)) {
      setError(t.login.invalid);
      return;
    }
    setLoading(true);
    try {
      const { token } = await adminApi.login(email.trim().toLowerCase(), pin);
      setToken(token);
      await adminApi.listReports('open');
      router.replace('/reports');
    } catch (err) {
      setToken(null);
      setError(
        err instanceof AuthError
          ? t.login.notAdmin
          : err.message || t.login.failed
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="mb-1 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <h1 className="text-lg font-semibold tracking-tight">Qup Pulse</h1>
          </div>
          <p className="text-sm text-slate-400">{t.login.dashboard}</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
              {t.login.email}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="none"
              autoComplete="username"
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
              placeholder={t.login.emailPlaceholder}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
              {t.login.pin}
            </label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              autoComplete="current-password"
              maxLength={4}
              className="font-data w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm tracking-[0.5em] outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="••••"
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {loading ? t.login.signingIn : t.login.signIn}
          </button>
        </form>

        <p className="mt-6 text-xs text-slate-600">
          {t.login.adminOnly}
        </p>
      </div>
    </div>
  );
}