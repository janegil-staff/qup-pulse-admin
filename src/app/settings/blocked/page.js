// qup-pulse-admin/src/app/settings/blocked/page.js
'use client';

// Blocked users — list + unblock. LOGGED-IN ONLY (redirects to / without a token).
// Localized via useLang() (t.app.blocked.* / t.app.settings.*).
//
// API:  GET    /blocks                  -> { blocked: [publicUser] }
//       DELETE /users/:userId/block     -> { blocked: false }
//
// The public user shape varies (id vs _id, photos optional), so reads are
// defensive — same tolerance the rest of the client uses.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken } from '../../../lib/api';
import { useLang } from '../../../context/LandingLang';
import AppNav from '../../../components/AppNav';
import { getBlockedUsers, unblockUser } from '../../../lib/profileSettingsApi';

const uid = (u) => u?.id || u?._id || '';
const avatarOf = (u) => u?.photos?.[0]?.url || u?.photo?.url || u?.avatar || '';

export default function BlockedUsersPage() {
  const router = useRouter();
  const { t } = useLang();
  const b = t.app.blocked;
  const s = t.app.settings;

  const [ready, setReady] = useState(false);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    const list = await getBlockedUsers();
    setUsers(Array.isArray(list) ? list : []);
  };

  useEffect(() => {
    if (!getToken()) { router.replace('/'); return; }
    load()
      .then(() => setReady(true))
      .catch((e) => { setError(e.message || b.loadFailed); setReady(true); });
  }, [router]);

  async function onUnblock(user) {
    const id = uid(user);
    if (!id) return;
    setBusyId(id);
    setError('');
    try {
      await unblockUser(id);
      setUsers((prev) => prev.filter((u) => uid(u) !== id));
    } catch (e) {
      setError(e.message || b.unblockFailed);
    } finally {
      setBusyId(null);
    }
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
        <Link
          href="/settings"
          className="mb-4 inline-block text-sm font-medium text-emerald-600 no-underline hover:underline dark:text-emerald-400"
        >
          ‹ {s.settingsTitle}
        </Link>

        <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {s.blockedUsers}
        </h1>

        {error ? (
          <p className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {users.length === 0 ? (
          <div className="rounded-2xl border border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-[#131c26] dark:text-slate-400 dark:shadow-none">
            {b.empty}
          </div>
        ) : (
          <div className="mb-4 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm dark:border-slate-800 dark:bg-[#131c26] dark:shadow-none">
            {users.map((u, i) => {
              const id = uid(u);
              const avatar = avatarOf(u);
              const busy = busyId === id;
              return (
                <div
                  key={id || i}
                  className={`flex items-center justify-between gap-3 px-5 py-4 ${
                    i === users.length - 1 ? '' : 'border-b border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-300 bg-slate-100 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span>{(u?.username || '?').slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="truncate text-[15px] text-slate-900 dark:text-slate-100">
                      {u?.username || '—'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUnblock(u)}
                    disabled={busy}
                    className="shrink-0 rounded-lg border border-slate-300 px-3.5 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {busy ? b.unblocking : b.unblock}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}