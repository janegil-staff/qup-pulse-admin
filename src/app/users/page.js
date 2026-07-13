// localpulse-admin/app/users/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, clearToken, getToken, AuthError } from '../../lib/api.js';
import AdminShell from '../AdminShell.js';

export default function UsersPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const bounce = useCallback(() => {
    clearToken();
    router.replace('/login');
  }, [router]);

  const load = useCallback(async (query) => {
    setLoading(true);
    setError('');
    try {
      const { users } = await adminApi.listUsers(query);
      setUsers(users);
    } catch (err) {
      if (err instanceof AuthError) return bounce();
      setError(err.message || 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, [bounce]);

  useEffect(() => {
    if (!getToken()) return bounce();
    load('');
  }, [load, bounce]);

  function onSearch(e) {
    e.preventDefault();
    load(q.trim());
  }

  async function toggleBan(user) {
    const next = !user.banned;
    if (next && !window.confirm(`Ban @${user.username}? They'll be signed out and blocked from the app.`)) return;
    setBusyId(user.id);
    try {
      await adminApi.banUser(user.id, next);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, banned: next } : u)));
    } catch (err) {
      if (err instanceof AuthError) return bounce();
      setError(err.message || 'Could not update user.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell>
      {/* Search */}
      <form onSubmit={onSearch} className="mb-5 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search username or email…"
          className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
        />
        <button
          type="submit"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
        >
          Search
        </button>
      </form>

      {error ? (
        <p className="mb-4 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="py-16 text-center text-sm text-slate-500">Loading users…</p>
      ) : users.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-500">No users found.</p>
      ) : (
        <ul className="space-y-2">
          {users.map((u) => {
            const busy = busyId === u.id;
            return (
              <li
                key={u.id}
                className={`flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3 ${
                  u.banned ? 'border-l-2 border-l-red-500' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">@{u.username}</span>
                    {u.role === 'admin' ? (
                      <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-xs text-sky-300">admin</span>
                    ) : null}
                    {u.banned ? (
                      <span className="rounded-full bg-red-400/15 px-2 py-0.5 text-xs text-red-300">banned</span>
                    ) : null}
                  </div>
                  <div className="font-data truncate text-xs text-slate-500">{u.email}</div>
                </div>

                <button
                  disabled={busy}
                  onClick={() => toggleBan(u)}
                  className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                    u.banned
                      ? 'bg-emerald-500/90 text-slate-950 hover:bg-emerald-400'
                      : 'border border-red-900/60 text-red-300 hover:bg-red-950/50'
                  }`}
                >
                  {busy ? '…' : u.banned ? 'Unban' : 'Ban'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
