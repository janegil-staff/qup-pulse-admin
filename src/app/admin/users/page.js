// qup-pulse-admin/src/app/admin/users/page.js
"use client";

// User administration. Sits inside the /admin layout, so no AppNav and no
// min-h-screen wrapper here — the layout owns both.
//
// Banning is optimistic: the row flips immediately and reverts if the PATCH
// fails. A moderator working through a list should not wait on a round-trip per
// row, and a failed ban that silently looked successful is worse than a flicker.
//
// Role changes are NOT optimistic, deliberately. A role change writes a
// RoleChange audit record, can be refused by the server for reasons the client
// cannot predict (you cannot change your own role), and is rare enough that a
// round-trip costs nothing. Showing a role that did not actually take is worse
// than a half-second of "saving". The select stays bound to state, so a
// rejected change snaps back on its own.

import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../../lib/api";
import { useLang } from "../../../context/LandingLang";

// Must match the enum in adminRolesController.js / User.js. If the server
// accepts a role that is not here it simply cannot be assigned from this page.
const ROLES = ["user", "moderator", "admin"];

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
  const [rolePending, setRolePending] = useState({});

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

  async function changeRole(user, nextRole) {
    const id = user._id || user.id;
    const current = user.role || "user";
    if (nextRole === current) return;

    setRolePending((prev) => ({ ...prev, [id]: true }));
    setError("");

    try {
      const data = await adminApi.setRole(id, nextRole);
      // Trust the server's echo when there is one — it is authoritative about
      // what actually landed, including a role the server may have coerced.
      const saved = (data && (data.user || data)) || {};
      const applied = typeof saved.role === "string" ? saved.role : nextRole;

      setUsers((prev) =>
        prev.map((u) => ((u._id || u.id) === id ? { ...u, role: applied } : u)),
      );
    } catch (e) {
      // A 403 carrying a code (self-change) reaches here as a normal error
      // rather than a logout — see the 403 branch in lib/api.js. Leaving state
      // untouched is what snaps the select back to the old value.
      setError(e.message || a.roleChangeFailed || p.saveFailed);
    } finally {
      setRolePending((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  }

  function roleLabel(role) {
    if (role === "admin") return nav.admin || "Admin";
    if (role === "moderator") return nav.moderator || "Moderator";
    return a.roleUser || "User";
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
            const roleBusy = Boolean(rolePending[id]);
            const role = user.role || "user";

            return (
              <li
                key={id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-300 bg-white p-4 dark:border-slate-800 dark:bg-[#131c26]"
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
                    {role === "admin" ? (
                      <span className="shrink-0 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-950">
                        {nav.admin}
                      </span>
                    ) : null}
                    {role === "moderator" ? (
                      <span className="shrink-0 rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-950">
                        {nav.moderator}
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

                <div className="flex shrink-0 items-center gap-3">
                  <label className="flex items-center gap-2">
                    <span className="sr-only">{a.roleLabel || "Role"}</span>
                    <select
                      value={role}
                      onChange={(e) => changeRole(user, e.target.value)}
                      disabled={roleBusy}
                      aria-label={a.roleLabel || "Role"}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 disabled:opacity-50 dark:border-slate-700 dark:bg-[#0b1016] dark:text-slate-200"
                    >
                      {ROLES.map((value) => (
                        <option key={value} value={value}>
                          {roleLabel(value)}
                        </option>
                      ))}
                    </select>
                  </label>

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
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
