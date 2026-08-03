// qup-pulse-admin/src/app/users/page.js
"use client";

// User lookup + ban/unban + role management. ADMIN ONLY (UX gate — the server
// still enforces requireAdmin).
//
// Uses the shared AppNav like every other authed page; the old AdminShell drew
// a second, competing header and hardcoded dark colours. Reports/Users are now
// sub-tabs inside the page.
//
// Fully localized via useLang() (t.app.users.*).
//
// Unlike the reports queue, listUsers returns `banned` and `role` on each row,
// so both controls reflect real state rather than being seeded lazily.
//
// Role changes use a <select> rather than a button: with three roles a button
// either cycles (easy to overshoot) or opens a menu anyway, and the select
// shows current state and available states at once.
//
// The server rejects two cases this page cannot reliably predict — changing
// your own role and demoting the last admin. Both come back with a `code` in
// the body and are mapped to specific messages below, because both are rules
// the admin should understand rather than errors.
//
// Matching on `code` and not on status matters: request() treats a codeless
// 403 as a failed admin check and bounces to login. Before codes existed, an
// admin who tried to change their own role was logged out by their own guard.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminApi, clearToken, getToken, AuthError } from "../../lib/api";
import { useLang } from "../../context/LandingLang";
import AppNav from "../../components/AppNav";

const ROLES = ["user", "moderator", "admin"];

export default function UsersPage() {
  const router = useRouter();
  const { t } = useLang();
  const u_ = t.app.users;

  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  // The signed-in admin's own id, so their row's selector can be disabled.
  // Falls back to null — if it can't be determined the selector stays enabled
  // and the server's 403 is the real gate.
  const [meId, setMeId] = useState(null);

  const roleLabel = useCallback(
    (role) => {
      if (role === "admin") return u_.roleAdmin;
      if (role === "moderator") return u_.roleModerator;
      return u_.roleUser;
    },
    [u_],
  );

  const bounce = useCallback(() => {
    clearToken();
    router.replace("/");
  }, [router]);

  const load = useCallback(
    async (query = "") => {
      setLoading(true);
      setError("");
      try {
        const { users: list } = await adminApi.listUsers(query);
        setUsers(list);
      } catch (err) {
        if (err instanceof AuthError) return bounce();
        setError(err.message || u_.err.load);
      } finally {
        setLoading(false);
      }
    },
    [bounce, u_],
  );

  useEffect(() => {
    if (!getToken()) return bounce();
    load();
  }, [load, bounce]);

  // Best-effort: identify the current admin so their own row is read-only.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await adminApi.me?.();
        if (!cancelled && me?.id) setMeId(String(me.id));
      } catch {
        // Non-fatal. The server still refuses self-changes with 403.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onSearch(e) {
    e.preventDefault();
    load(q.trim());
  }

  async function toggleBan(user) {
    const next = !user.banned;
    if (next && !window.confirm(u_.confirmBan.replace("{name}", user.username)))
      return;
    setBusyId(user.id);
    try {
      await adminApi.banUser(user.id, next);
      setUsers((prev) =>
        prev.map((x) => (x.id === user.id ? { ...x, banned: next } : x)),
      );
      setError("");
    } catch (err) {
      if (err instanceof AuthError) return bounce();
      setError(err.message || u_.err.update);
    } finally {
      setBusyId(null);
    }
  }

  async function changeRole(user, nextRole) {
    if (nextRole === user.role) return;

    const ok = window.confirm(
      u_.confirmRoleChange
        .replace("{name}", user.username)
        .replace("{role}", roleLabel(nextRole)),
    );
    if (!ok) return;

    setBusyId(user.id);
    try {
      await adminApi.setRole(user.id, nextRole);
      setUsers((prev) =>
        prev.map((x) => (x.id === user.id ? { ...x, role: nextRole } : x)),
      );
      setError("");
    } catch (err) {
      if (err instanceof AuthError) return bounce();
      // These are rules the endpoint enforces, not failures — say which rule.
      // Matched on `code` rather than status: a 403 from the role endpoint and
      // a 403 from a failed admin check mean opposite things, and only the
      // latter should ever log someone out.
      if (err.code === "self_role_change") setError(u_.err.roleSelf);
      else if (err.code === "last_admin") setError(u_.err.lastAdmin);
      else setError(err.message || u_.err.role);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-100">
      <AppNav />
      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Admin sub-tabs */}
        <div className="mb-5 flex gap-1 rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-800 dark:bg-slate-900/50">
          <Link
            href="/reports"
            className="flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium text-slate-500 no-underline transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {u_.reports}
          </Link>
          <Link
            href="/users"
            className="flex-1 rounded-md bg-slate-100 px-3 py-1.5 text-center text-sm font-medium text-slate-900 no-underline transition dark:bg-slate-800 dark:text-slate-100"
          >
            {u_.title}
          </Link>
        </div>

        {/* Search */}
        <form onSubmit={onSearch} className="mb-4 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={u_.searchPlaceholder}
            autoCapitalize="none"
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-900 dark:placeholder:text-slate-500"
          />
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {u_.search}
          </button>
        </form>

        {error ? (
          <p className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
            {u_.loading}
          </p>
        ) : users.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
            {u_.empty}
          </p>
        ) : (
          <ul className="space-y-2">
            {users.map((u) => {
              const busy = busyId === u.id;
              const isSelf = meId != null && String(u.id) === meId;
              return (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-none"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/profile/${encodeURIComponent(u.username)}`}
                        className="truncate text-sm font-medium text-slate-900 no-underline hover:underline dark:text-slate-100"
                      >
                        @{u.username}
                      </Link>
                      {u.role && u.role !== "user" ? (
                        <span className="shrink-0 rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-400/15 dark:text-sky-300">
                          {roleLabel(u.role)}
                        </span>
                      ) : null}
                      {u.banned ? (
                        <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-400/15 dark:text-red-300">
                          {u_.banned}
                        </span>
                      ) : null}
                    </div>
                    <p className="font-data truncate text-xs text-slate-500 dark:text-slate-500">
                      {u.email}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <label className="sr-only" htmlFor={`role-${u.id}`}>
                      {u_.role}
                    </label>
                    <select
                      id={`role-${u.id}`}
                      value={u.role || "user"}
                      disabled={busy || isSelf}
                      title={isSelf ? u_.err.roleSelf : u_.changeRole}
                      onChange={(e) => changeRole(u, e.target.value)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 outline-none transition disabled:opacity-50 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {roleLabel(r)}
                        </option>
                      ))}
                    </select>

                    <button
                      disabled={busy}
                      onClick={() => toggleBan(u)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                        u.banned
                          ? "bg-emerald-500 text-emerald-950 hover:brightness-105"
                          : "border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/50"
                      }`}
                    >
                      {u.banned ? u_.unban : u_.ban}
                    </button>
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
