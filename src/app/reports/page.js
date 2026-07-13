// localpulse-admin/app/reports/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, clearToken, getToken, AuthError } from '../../lib/api.js';

const FILTERS = [
  { key: 'open', label: 'Open' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'dismissed', label: 'Dismissed' },
  { key: '', label: 'All' },
];

// Left-border + badge color per status — the queue reads by color before you
// read a word. Amber = needs attention, emerald = handled, slate = set aside.
const STATUS_STYLE = {
  open: { border: 'border-l-amber-400', badge: 'bg-amber-400/15 text-amber-300' },
  reviewed: { border: 'border-l-emerald-400', badge: 'bg-emerald-400/15 text-emerald-300' },
  dismissed: { border: 'border-l-slate-500', badge: 'bg-slate-500/15 text-slate-400' },
};

function timeAgo(iso) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function ReportsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState('open');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const bounce = useCallback(() => {
    clearToken();
    router.replace('/login');
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { reports } = await adminApi.listReports(filter);
      setReports(reports);
    } catch (err) {
      if (err instanceof AuthError) return bounce();
      setError(err.message || 'Could not load reports.');
    } finally {
      setLoading(false);
    }
  }, [filter, bounce]);

  useEffect(() => {
    if (!getToken()) return bounce();
    load();
  }, [load, bounce]);

  async function resolve(id, status) {
    setBusyId(id);
    try {
      await adminApi.resolveReport(id, status);
      // Reflect immediately: drop it from a filtered view, or update in place.
      setReports((prev) =>
        filter && filter !== status
          ? prev.filter((r) => r.id !== id)
          : prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    } catch (err) {
      if (err instanceof AuthError) return bounce();
      setError(err.message || 'Could not update report.');
    } finally {
      setBusyId(null);
    }
  }

  async function ban(userId) {
    if (!userId) return;
    if (!window.confirm('Ban this user? They will be blocked from the app.')) return;
    setBusyId(userId);
    try {
      await adminApi.banUser(userId, true);
      setError('');
    } catch (err) {
      if (err instanceof AuthError) return bounce();
      setError(err.message || 'Could not ban user.');
    } finally {
      setBusyId(null);
    }
  }

  async function removePost(postId) {
    if (!postId) return;
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    setBusyId(postId);
    try {
      await adminApi.deletePost(postId);
      setError('');
    } catch (err) {
      if (err instanceof AuthError) return bounce();
      setError(err.message || 'Could not delete post.');
    } finally {
      setBusyId(null);
    }
  }

  const openCount = reports.filter((r) => r.status === 'open').length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <h1 className="text-lg font-semibold tracking-tight">Reports</h1>
          {filter === 'open' && !loading ? (
            <span className="font-data ml-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs text-amber-300">
              {openCount}
            </span>
          ) : null}
        </div>
        <button
          onClick={bounce}
          className="text-xs text-slate-400 transition hover:text-slate-200"
        >
          Sign out
        </button>
      </header>

      {/* Filter tabs */}
      <div className="mb-5 flex gap-1 rounded-lg border border-slate-800 bg-slate-900/50 p-1">
        {FILTERS.map((f) => (
          <button
            key={f.key || 'all'}
            onClick={() => setFilter(f.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              filter === f.key
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {/* List */}
      {loading ? (
        <p className="py-16 text-center text-sm text-slate-500">Loading reports…</p>
      ) : reports.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-500">
          Nothing here. {filter === 'open' ? 'No open reports — the queue is clear.' : 'No reports in this view.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => {
            const style = STATUS_STYLE[r.status] || STATUS_STYLE.dismissed;
            const target = r.reportedUser
              ? { kind: 'user', name: r.reportedUser.username, id: r.reportedUser.id }
              : r.post
              ? { kind: 'post', name: 'post', id: r.post.id }
              : { kind: 'unknown', name: '(deleted)', id: null };
            const busy = busyId === r.id || busyId === target.id;

            return (
              <li
                key={r.id}
                className={`rounded-lg border border-slate-800 border-l-2 bg-slate-900/40 p-4 ${style.border}`}
              >
                {/* Top row: reason + status + time */}
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold capitalize">{r.reason}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${style.badge}`}>
                      {r.status}
                    </span>
                  </div>
                  <span className="font-data text-xs text-slate-500">{timeAgo(r.createdAt)}</span>
                </div>

                {/* Target + reporter */}
                <div className="mb-1 text-sm text-slate-300">
                  {target.kind === 'user' ? (
                    <>Reported user <span className="font-medium text-slate-100">@{target.name}</span></>
                  ) : target.kind === 'post' ? (
                    <>Reported post <span className="font-data text-xs text-slate-500">{target.id}</span></>
                  ) : (
                    <span className="text-slate-500">Target no longer exists</span>
                  )}
                </div>
                <div className="mb-2 text-xs text-slate-500">
                  by {r.reporter ? `@${r.reporter.username}` : 'unknown'}
                </div>

                {/* Post text preview */}
                {r.post?.text ? (
                  <blockquote className="mb-3 rounded border-l-2 border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-300">
                    {r.post.text}
                  </blockquote>
                ) : null}

                {/* Reporter note */}
                {r.note ? (
                  <p className="mb-3 text-sm text-slate-400">
                    <span className="text-slate-500">Note:</span> {r.note}
                  </p>
                ) : null}

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {r.status !== 'reviewed' ? (
                    <button
                      disabled={busy}
                      onClick={() => resolve(r.id, 'reviewed')}
                      className="rounded-md bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
                    >
                      Mark reviewed
                    </button>
                  ) : null}
                  {r.status !== 'dismissed' ? (
                    <button
                      disabled={busy}
                      onClick={() => resolve(r.id, 'dismissed')}
                      className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  ) : null}

                  <span className="mx-1 h-4 w-px bg-slate-800" />

                  {target.kind === 'user' && target.id ? (
                    <button
                      disabled={busy}
                      onClick={() => ban(target.id)}
                      className="rounded-md border border-red-900/60 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-950/50 disabled:opacity-50"
                    >
                      Ban user
                    </button>
                  ) : null}
                  {target.kind === 'post' && target.id ? (
                    <button
                      disabled={busy}
                      onClick={() => removePost(target.id)}
                      className="rounded-md border border-red-900/60 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-950/50 disabled:opacity-50"
                    >
                      Delete post
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
