// localpulse-admin/app/login/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, setToken, AuthError } from '../../lib/api.js';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !/^\d{4}$/.test(pin)) {
      setError('Enter your email and 4-digit PIN.');
      return;
    }
    setLoading(true);
    try {
      // Log in with the app credentials to get a JWT.
      const { token } = await adminApi.login(email.trim().toLowerCase(), pin);
      setToken(token);
      // Verify admin by actually hitting an admin route. requireAdmin returns
      // 403 for non-admins, which the client turns into AuthError — so a
      // regular user's token never reaches the dashboard.
      await adminApi.listReports('open');
      router.replace('/reports');
    } catch (err) {
      setToken(null);
      setError(
        err instanceof AuthError
          ? 'That account is not an administrator.'
          : err.message || 'Could not log in.'
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
          <p className="text-sm text-slate-400">Moderation dashboard</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="none"
              autoComplete="username"
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
              PIN
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
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-xs text-slate-600">
          Admin access only. Sign in with an administrator account.
        </p>
      </div>
    </div>
  );
}
