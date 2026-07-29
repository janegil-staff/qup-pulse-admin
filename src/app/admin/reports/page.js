// qup-pulse-admin/src/app/admin/reports/page.js
"use client";

// Moderation queue. Sits inside the /admin layout, so no AppNav and no
// min-h-screen wrapper here.
//
// This surface is compliance-critical: App Store and Play review both require a
// working path from a user report to a moderator decision. Keep it functional.
//
// Filtering happens server-side via ?status= so the queue does not have to load
// every report ever filed to show the open ones.

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../../lib/api";
import { useLang } from "../../../context/LandingLang";

export default function AdminReportsPage() {
  const { t } = useLang();
  const a = t.app.admin || {};
  const nav = t.app.nav || {};
  const p = t.app.profile;
  const s = t.app.settings;

  const [status, setStatus] = useState("pending");
  const [reports, setReports] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState({});

  const filters = [
    { value: "pending", label: a.filterPending },
    { value: "resolved", label: a.filterResolved },
    { value: "dismissed", label: a.filterDismissed },
    { value: "", label: a.filterAll },
  ];

  const load = useCallback(
    async (nextStatus) => {
      setReports(null);
      setError("");
      try {
        const data = await adminApi.listReports(nextStatus);
        // Shape varies by controller — accept a bare array or a wrapper.
        setReports(
          Array.isArray(data) ? data : data.reports || data.items || [],
        );
      } catch (e) {
        setError(e.message || p.loadFailed);
        setReports([]);
      }
    },
    [p.loadFailed],
  );

  useEffect(() => {
    load(status);
  }, [status, load]);

  async function resolve(report, nextStatus) {
    const id = report._id || report.id;

    setPending((prev) => ({ ...prev, [id]: true }));
    setError("");

    try {
      await adminApi.resolveReport(id, nextStatus);
      // Drop it from the current view rather than refetching — on the
      // "pending" filter it no longer belongs here, and a refetch would
      // reorder everything the moderator is working through.
      setReports((prev) =>
        status === ""
          ? prev.map((r) =>
              (r._id || r.id) === id ? { ...r, status: nextStatus } : r,
            )
          : prev.filter((r) => (r._id || r.id) !== id),
      );
    } catch (e) {
      setError(e.message || p.saveFailed);
    } finally {
      setPending((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        {nav.reports}
      </h1>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {filters.map((filter) => (
          <button
            key={filter.value || "all"}
            type="button"
            onClick={() => setStatus(filter.value)}
            className={
              "rounded-lg px-3.5 py-1.5 text-sm font-semibold transition " +
              (status === filter.value
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : "text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800")
            }
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {reports === null ? (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          {s.loading}
        </p>
      ) : reports.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400 dark:text-slate-600">
          {a.noResults}
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {reports.map((report) => {
            const id = report._id || report.id;
            const busy = Boolean(pending[id]);
            const reporter = report.reporter || report.reportedBy || {};
            const target =
              report.targetUser || report.reportedUser || report.target || {};

            return (
              <li
                key={id}
                className="rounded-2xl border border-slate-300 bg-white p-5 dark:border-slate-800 dark:bg-[#131c26]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-slate-900 dark:text-white">
                      @{target.username || target.displayName || "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-600">
                      {a.reportedBy} @{reporter.username || "—"}
                      {report.createdAt
                        ? ` · ${new Date(report.createdAt).toLocaleString()}`
                        : ""}
                    </p>
                  </div>

                  {report.status ? (
                    <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {report.status}
                    </span>
                  ) : null}
                </div>

                {report.reason ? (
                  <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {report.reason}
                  </p>
                ) : null}

                {report.details || report.description ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {report.details || report.description}
                  </p>
                ) : null}

                {report.status === "pending" || !report.status ? (
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => resolve(report, "resolved")}
                      disabled={busy}
                      className="rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-emerald-950 transition hover:brightness-105 disabled:opacity-50"
                    >
                      {a.resolve}
                    </button>
                    <button
                      type="button"
                      onClick={() => resolve(report, "dismissed")}
                      disabled={busy}
                      className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {a.dismiss}
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
