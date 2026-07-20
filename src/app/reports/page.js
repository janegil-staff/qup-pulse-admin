// qup-pulse-admin/src/app/reports/page.js
'use client';

// Moderation queue. ADMIN ONLY (UX gate — the server still enforces
// requireAdmin on every /admin route).
//
// Uses the shared AppNav like every other authed page; the old AdminShell drew
// a second, competing header and hardcoded dark colours. Reports/Users are now
// sub-tabs inside the page.
//
// Fully localized via useLang() (t.app.reports.*). Report reasons and statuses
// come back from the server as enum VALUES ('spam', 'open', ...) and are looked
// up for display — never translated on the wire.

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi, clearToken, getToken, AuthError } from '../../lib/api';
import { useLang } from '../../context/LandingLang';
import AppNav from '../../components/AppNav';

// Keys mirror REPORT_STATUS in server/src/models/Report.js. '' = All (no filter).
const FILTERS = ['open', 'reviewed', 'dismissed', ''];

// Left-border + badge colour per status — the queue reads by colour before you
// read a word. Amber = needs attention, emerald = handled, slate = set aside.
// Both modes carry their own values; the old dark-only palette was invisible in
// light mode.
const STATUS_STYLE = {
  open: {
    border: 'border-l-amber-500 dark:border-l-amber-400',
    badge: 'bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
  },
  reviewed: {
    border: 'border-l-emerald-500 dark:border-l-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  },
  dismissed: {
    border: 'border-l-slate-400 dark:border-l-slate-500',
    badge: 'bg-slate-500/15 text-slate-600 dark:text-slate-400',
  },
};

// Relative time. Unit suffixes are translated; the number is not.
function timeAgo(iso, u) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}${u.seconds}`;
  if (s < 3600) return `${Math.floor(s / 60)}${u.minutes}`;
  if (s < 86400) return `${Math.floor(s / 3600)}${u.hours}`;
  return `${Math.floor(s / 86400)}${u.days}`;
}

export default function ReportsPage() {
  const router = useRouter();
  const { t } = useLang();
  const r_ = t.app.reports;
  const s_ = t.app.settings;

  const [filter, setFilter] = useState('open');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  // Ban state for reported users so the button can toggle Ban/Unban. Keyed by
  // user id; seeded lazily as we act on them, since listReports' toPublic()
  // projection doesn't include `banned`.
  const [bannedMap, setBannedMap] = useState({});

  const bounce = useCallback(() => {
    clearToken();
    router.replace('/');
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { reports: list } = await adminApi.listReports(filter);
      setReports(list);
    } catch (err) {
      if (err instanceof AuthError) return bounce();
      setError(err.message || r_.err.load);
    } finally {
      setLoading(false);
    }
  }, [filter, bounce, r_]);

  useEffect(() => {
    if (!getToken()) return bounce();
    load();
  }, [load, bounce]);

  async function resolve(id, status) {
    setBusyId(id);
    try {
      await adminApi.resolveReport(id, status);
      setReports((prev) =>
        filter && filter !== status
          ? prev.filter((x) => x.id !== id)
          : prev.map((x) => (x.id === id ? { ...x, status } : x))
      );
    } catch (err) {
      if (err instanceof AuthError) return bounce();
      setError(err.message || r_.err.update);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleBan(userId, currentlyBanned) {
    if (!userId) return;
    const next = !currentlyBanned;
    if (next && !window.confirm(r_.confirmBan)) return;
    setBusyId(userId);
    try {
      await adminApi.banUser(userId, next);
      setBannedMap((m) => ({ ...m, [userId]: next }));
      setError('');
    } catch (err) {
      if (err instanceof AuthError) return bounce();
      setError(err.message || r_.err.updateUser);
    } finally {
      setBusyId(null);
    }
  }

  async function removePost(postId) {
    if (!postId) return;
    if (!window.confirm(r_.confirmDeletePost)) return;
    setBusyId(postId);
    // Optimistically drop every report pointing at this post — deleting the
    // post resolves all of them, so the rows should disappear immediately
    // rather than waiting for a manual refresh. Keep a snapshot to restore if
    // the server rejects the delete.
    const snapshot = reports;
    const pid = String(postId);
    setReports((prev) => prev.filter((x) => String(x.post?.id) !== pid));
    try {
      await adminApi.deletePost(postId);
      setError('');
    } catch (err) {
      setReports(snapshot); // roll back the optimistic removal
      if (err instanceof AuthError) return bounce();
      setError(err.message || r_.err.deletePost);
    } finally {
      setBusyId(null);
    }
  }

  const openCount = reports.filter((x) => x.status === 'open').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-100">
      <AppNav />
      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Admin sub-tabs */}
        <div className="mb-5 flex gap-1 rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-800 dark:bg-slate-900/50">
          <Link
            href="/reports"
            className="flex-1 rounded-md bg-slate-100 px-3 py-1.5 text-center text-sm font-medium text-slate-900 no-underline transition dark:bg-slate-800 dark:text-slate-100"
          >
            {r_.title}
          </Link>
          <Link
            href="/users"
            className="flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium text-slate-500 no-underline transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {r_.users}
          </Link>
        </div>

        {/* Filter tabs + open count */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex flex-1 gap-1 rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-800 dark:bg-slate-900/50">
            {FILTERS.map((k) => (
              <button
                key={k || 'all'}
                onClick={() => setFilter(k)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  filter === k
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {k ? r_.filters[k] : r_.filters.all}
              </button>
            ))}
          </div>
          {filter === 'open' && !loading ? (
            <span className="ml-3 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
              {openCount}
            </span>
          ) : null}
        </div>

        {error ? (
          <p className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">{r_.loading}</p>
        ) : reports.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
            {filter === 'open' ? r_.emptyOpen : r_.emptyOther}
          </p>
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => {
              const style = STATUS_STYLE[r.status] || STATUS_STYLE.dismissed;
              const target = r.reportedUser
                ? { kind: 'user', name: r.reportedUser.username, id: r.reportedUser.id }
                : r.post
                ? { kind: 'post', name: 'post', id: r.post.id }
                : { kind: 'unknown', name: '', id: null };
              const busy = busyId === r.id || busyId === target.id;
              const isBanned = target.id ? Boolean(bannedMap[target.id]) : false;

              return (
                <li
                  key={r.id}
                  className={`rounded-xl border border-l-2 border-slate-300 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-none ${style.border}`}
                >
                  {/* Top row: reason + status + time */}
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {r_.reasons[r.reason] || r.reason}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}>
                        {r_.statuses[r.status] || r.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {timeAgo(r.createdAt, r_.time)}
                    </span>
                  </div>

                  {/* Target + reporter */}
                  <div className="mb-1 text-sm text-slate-700 dark:text-slate-300">
                    {target.kind === 'user' ? (
                      <>
                        {r_.reportedUser}{' '}
                        <Link
                          href={`/profile/${encodeURIComponent(target.name)}`}
                          className="font-medium text-slate-900 no-underline hover:underline dark:text-slate-100"
                        >
                          @{target.name}
                        </Link>
                        {isBanned ? (
                          <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-400/15 dark:text-red-300">
                            {r_.banned}
                          </span>
                        ) : null}
                      </>
                    ) : target.kind === 'post' ? (
                      <>
                        {r_.reportedPost}{' '}
                        <span className="text-xs text-slate-400 dark:text-slate-500">{target.id}</span>
                      </>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">{r_.targetGone}</span>
                    )}
                  </div>
                  <div className="mb-2 text-xs text-slate-500 dark:text-slate-500">
                    {r_.by} {r.reporter ? `@${r.reporter.username}` : r_.unknown}
                  </div>

                  {/* Post text preview */}
                  {r.post?.text ? (
                    <blockquote className="mb-3 rounded border-l-2 border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                      {r.post.text}
                    </blockquote>
                  ) : null}

                  {/* Reporter note — readable in both modes; the old slate-400
                      on white was effectively invisible. */}
                  {r.note ? (
                    <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">{r_.note}</span>{' '}
                      {r.note}
                    </p>
                  ) : null}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {r.status !== 'reviewed' ? (
                      <button
                        disabled={busy}
                        onClick={() => resolve(r.id, 'reviewed')}
                        className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-950 transition hover:brightness-105 disabled:opacity-50"
                      >
                        {r_.markReviewed}
                      </button>
                    ) : null}
                    {r.status !== 'dismissed' ? (
                      <button
                        disabled={busy}
                        onClick={() => resolve(r.id, 'dismissed')}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        {r_.dismiss}
                      </button>
                    ) : null}

                    <span className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-800" />

                    {target.kind === 'user' && target.id ? (
                      <button
                        disabled={busy}
                        onClick={() => toggleBan(target.id, isBanned)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                          isBanned
                            ? 'bg-emerald-500 text-emerald-950 hover:brightness-105'
                            : 'border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/50'
                        }`}
                      >
                        {isBanned ? r_.unbanUser : r_.banUser}
                      </button>
                    ) : null}
                    {target.kind === 'post' && target.id ? (
                      <button
                        disabled={busy}
                        onClick={() => removePost(target.id)}
                        className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/50"
                      >
                        {r_.deletePost}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}