// qup-pulse-admin/src/app/admin/users/page.js
"use client";

// User administration. Sits inside the /admin layout, so no AppNav and no
// min-h-screen wrapper here — the layout owns both.
//
// Banning is optimistic: the row flips immediately and reverts if the PATCH
// fails. A moderator working through a list should not wait on a round-trip per
// row, and a failed ban that silently looked successful is worse than a flicker.

import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../../lib/api";
import { useLang } from "../../../context/LandingLang";

export default function AdminUsersPage() {
  const { t } = useLang();
  const a = t.app.admin || {};
  const nav = t.app.nav || {};
  const p = t.app.profile;
  const s = t.app.settings;

  const [users, setUsers] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState({});

  useEffect(() => {
    let cancelled = false;

    adminApi
      .listUsers()
      .then((data) => {
        if (cancelled) return;
        // Shape varies by controller — accept a bare array or a wrapper.
        setUsers(Array.isArray(data) ? data : data.users || data.items || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || p.loadFailed);
      });

    return () => {
      cancelled = true;
    };
  }, [p.loadFailed]);

  const filtered = useMemo(() => {
    if (!users) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return users;

    return users.filter((u) =>
      [u.username, u.displayName, u.email]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle)),
    );
  }, [users, query]);

  async function toggleBan(user) {
    const id = user._id || user.id;
    const next = !user.banned;

    setPending((prev) => ({ ...prev, [id]: true }));
    setError("");
    setUsers((prev) =>
      prev.map((u) => ((u._id || u.id) === id ? { ...u, banned: next } : u)),
    );

    try {
      await adminApi.banUser(id, next);
    } catch (e) {
      setError(e.message || p.saveFailed);
      setUsers((prev) =>
        prev.map((u) => ((u._id || u.id) === id ? { ...u, banned: !next } : u)),
      );
    } finally {
      setPending((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  }

  if (users === null && !error) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">{s.loading}</p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {nav.users || "Users"}
        </h1>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={a.searchPlaceholder}
          className="w-full max-w-xs rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#0b1016] sm:w-64"
        />
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400 dark:text-slate-600">
          {a.noResults}
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {filtered.map((user) => {
            const id = user._id || user.id;
            const avatar = user.photos?.[0]?.url || "";
            const name = user.displayName || user.username || "—";
            const busy = Boolean(pending[id]);

            return (
              <li
                key={id}
                className="flex items-center gap-4 rounded-2xl border border-slate-300 bg-white p-4 dark:border-slate-800 dark:bg-[#131c26]"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatar}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold">
                      {name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-white">
                      {name}
                    </p>
                    {user.role === "admin" ? (
                      <span className="shrink-0 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-950">
                        {nav.admin}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                    @{user.username}
                    {user.email ? ` · ${user.email}` : ""}
                  </p>
                  {user.createdAt ? (
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-600">
                      {a.joined} {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  ) : null}
                </div>

                <span
                  className={
                    "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide " +
                    (user.banned
                      ? "bg-red-500/15 text-red-700 dark:text-red-400"
                      : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400")
                  }
                >
                  {user.banned ? a.statusBanned : a.statusActive}
                </span>

                <button
                  type="button"
                  onClick={() => toggleBan(user)}
                  disabled={busy}
                  className={
                    "shrink-0 rounded-lg border px-3.5 py-1.5 text-sm font-semibold transition disabled:opacity-50 " +
                    (user.banned
                      ? "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      : "border-red-300 text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10")
                  }
                >
                  {user.banned ? a.unban : a.ban}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
