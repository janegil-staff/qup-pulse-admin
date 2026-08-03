// qup-pulse-admin/src/app/admin/seed/page.js
"use client";

// Seed tooling. Sits inside the /admin layout, so no AppNav, no page background
// and no max-width wrapper here — the layout owns all three.
//
// up/down run as background jobs: the POST returns a job id immediately and this
// page polls for progress, so nothing depends on a request staying open long
// enough to outlast a proxy timeout.
//
// ADMIN ONLY, and this page says so itself.
//
// The layout admits all staff — admins and moderators — because moderators
// need Reports, Deleted and Removed. Seeding is not moderation: it writes and
// deletes bulk data, and the server has always treated it as admin-only in two
// places (router.use(requireAuth, requireAdmin) in seed.routes.js, plus a
// second role check inside adminSeedController). Nothing here can be executed
// by a moderator regardless of what this page renders.
//
// The gate below is therefore not a security boundary; it exists so that a
// moderator who reaches this URL — bookmarked, shared, or typed — is told no
// immediately instead of being shown a form full of destructive buttons that
// 403 only after they fill it in and press one. Hiding the sidebar link is the
// other half; this half is the one that survives someone having the URL.
//
// isAdmin() is read in an effect rather than during render because it reads
// localStorage, which does not exist during prerender. `admin === null` is the
// pre-check state and renders nothing, matching how the layout handles `ready`.
//
// NOT TRANSLATED, deliberately, consistent with the rest of this file: seed
// tooling is internal and every string on this page is already hardcoded
// English. If this page is ever translated, the two strings below go in with
// all the others rather than being special-cased now.

import { useCallback, useEffect, useRef, useState } from "react";
import { seedApi, AuthError, isAdmin } from "../../../lib/api";

const POLL_INTERVAL_MS = 1000;

const STEPS = [
  {
    id: "insert-assets",
    label: "Upload seed assets",
    run: () => seedApi.uploadAssets(),
  },
  {
    id: "insert-data",
    label: "Seed users + posts",
    run: (ctx) => seedApi.seedData(ctx.options),
  },
  {
    id: "insert-comments",
    label: "Seed comments",
    run: () => seedApi.seedComments(),
  },
  {
    id: "remove-assets",
    label: "Remove seed assets",
    run: (ctx) => seedApi.removeAssets(ctx.confirm),
    destructive: true,
    dryRunnable: true,
  },
  {
    id: "remove-comments",
    label: "Remove seed comments",
    run: (ctx) => seedApi.removeComments(ctx.confirm),
    destructive: true,
  },
  {
    id: "remove-data",
    label: "Remove demo data",
    run: (ctx) => seedApi.removeData(ctx.confirm),
    destructive: true,
  },
];

const STATUS_STYLES = {
  running: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  succeeded: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  failed: "bg-red-500/15 text-red-700 dark:text-red-400",
  cancelled:
    "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const CARD =
  "rounded-2xl border border-slate-300 bg-white p-5 dark:border-slate-800 dark:bg-[#131c26]";
const INPUT =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#0b1016]";
const LABEL =
  "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";

export default function SeedPage() {
  // null = not checked yet. Set in an effect; see the header note.
  const [admin, setAdmin] = useState(null);

  const [runningStep, setRunningStep] = useState(null);
  const [job, setJob] = useState(null);
  const [log, setLog] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);

  const [lat, setLat] = useState("60.3913");
  const [lng, setLng] = useState("5.3221");
  const [posts, setPosts] = useState("30");

  const logEndRef = useRef(null);
  const logCursorRef = useRef(0);

  const jobRunning = job?.status === "running";
  const busy = runningStep !== null || jobRunning;

  useEffect(() => {
    setAdmin(isAdmin());
  }, []);

  function options() {
    return { lat: Number(lat), lng: Number(lng), posts: Number(posts) };
  }

  function reset() {
    setError("");
    setSummary(null);
    setLog([]);
    setJob(null);
    logCursorRef.current = 0;
  }

  async function runStep(id, task) {
    if (busy) return;
    reset();
    setRunningStep(id);

    try {
      const payload = await task({ confirm, options: options() });
      const { log: lines, ok, ...rest } = payload;
      setLog(lines || []);
      setSummary(rest);
    } catch (e) {
      setError(e.message || "Request failed.");
      if (Array.isArray(e?.log)) setLog(e.log);
      if (e instanceof AuthError && e.status === 401) {
        console.warn("Seed request rejected: session expired.");
      }
    } finally {
      setRunningStep(null);
    }
  }

  async function startJob(starter) {
    if (busy) return;
    reset();

    try {
      const { jobId } = await starter();
      setJob({ id: jobId, status: "running", step: null });
    } catch (e) {
      // 409 means a job is already running.
      setError(e.message || "Could not start job.");
    }
  }

  const poll = useCallback(async (jobId) => {
    try {
      const { job: next } = await seedApi.getJob(jobId, logCursorRef.current);

      if (next.log.length > 0) {
        setLog((previous) => [...previous, ...next.log]);
        logCursorRef.current = next.logLength;
      }

      setJob(next);

      if (next.status !== "running") {
        if (next.result) setSummary(next.result);
        if (next.error) setError(next.error);
      }
    } catch (e) {
      setError(e.message || "Lost contact with the job.");
      setJob((previous) =>
        previous ? { ...previous, status: "failed" } : null,
      );
    }
  }, []);

  useEffect(() => {
    if (!job?.id || job.status !== "running") return undefined;
    const timer = setInterval(() => poll(job.id), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [job?.id, job?.status, poll]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: "end" });
  }, [log]);

  async function cancel() {
    if (!job?.id) return;
    try {
      await seedApi.cancelJob(job.id);
      setJob((previous) =>
        previous ? { ...previous, cancelRequested: true } : null,
      );
    } catch (e) {
      setError(e.message || "Could not cancel.");
    }
  }

  // Every hook above runs unconditionally; the returns below are the only
  // branch. Order is fixed on every render, which is what React requires.

  if (admin === null) return null;

  if (!admin) {
    return (
      <>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Seed data
        </h1>
        <div className={`mt-6 ${CARD}`}>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Administrators only
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Seed tooling creates and deletes demo accounts, posts and uploaded
            assets in bulk, so it is restricted to administrators. Moderation
            tools — reports, deleted messages and removed messages — are
            unaffected and remain available in the sidebar.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Seed data
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Development tooling. Creates and removes demo users, posts, comments and
        Cloudinary assets.
      </p>

      {/* ── Seed options ─────────────────────────────────────────────── */}
      <section className={`mt-6 ${CARD}`}>
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Seed options
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className={LABEL}>
            Center latitude
            <input
              type="number"
              step="0.0001"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className={INPUT}
            />
          </label>
          <label className={LABEL}>
            Center longitude
            <input
              type="number"
              step="0.0001"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className={INPUT}
            />
          </label>
          <label className={LABEL}>
            Number of posts
            <input
              type="number"
              min="0"
              value={posts}
              onChange={(e) => setPosts(e.target.value)}
              className={INPUT}
            />
          </label>
        </div>
      </section>

      {/* ── Full run ─────────────────────────────────────────────────── */}
      <section className={`mt-4 ${CARD}`}>
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Full run
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Runs in the background. Progress streams below and survives a page
          refresh as long as the API stays up.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => startJob(() => seedApi.up(options()))}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:brightness-105 disabled:opacity-50"
          >
            Seed everything (up)
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => startJob(() => seedApi.down(confirm))}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            {confirm
              ? "Delete everything (down)"
              : "Preview deletion (dry run)"}
          </button>
        </div>
      </section>

      {/* ── Individual steps ─────────────────────────────────────────── */}
      <section className={`mt-4 ${CARD}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Individual steps
          </h2>
          <label className="flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-400">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
              className="accent-red-500"
            />
            Confirm destructive operations
          </label>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {STEPS.map((step) => {
            const blocked = step.destructive && !step.dryRunnable && !confirm;

            return (
              <button
                key={step.id}
                type="button"
                disabled={busy || blocked}
                onClick={() => runStep(step.id, step.run)}
                className={
                  "rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition disabled:opacity-40 " +
                  (step.destructive
                    ? "border-red-300 text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
                    : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800")
                }
              >
                {runningStep === step.id ? "Running…" : step.label}
                {step.dryRunnable && !confirm ? (
                  <span className="block text-xs font-normal text-slate-400 dark:text-slate-500">
                    dry run
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Job status ───────────────────────────────────────────────── */}
      {job ? (
        <section className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-300 bg-white p-4 dark:border-slate-800 dark:bg-[#131c26]">
          <span
            className={
              "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide " +
              (STATUS_STYLES[job.status] ||
                "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400")
            }
          >
            {job.status}
          </span>
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {job.step || (job.status === "running" ? "Starting…" : "Finished")}
          </span>
          {typeof job.durationMs === "number" ? (
            <span className="text-xs text-slate-400 dark:text-slate-600">
              {Math.round(job.durationMs / 1000)}s
            </span>
          ) : null}

          {job.status === "running" ? (
            <button
              type="button"
              onClick={cancel}
              disabled={job.cancelRequested}
              className="ml-auto rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {job.cancelRequested ? "Cancelling…" : "Cancel"}
            </button>
          ) : null}
        </section>
      ) : null}

      {/* ── Output ───────────────────────────────────────────────────── */}
      {error ? (
        <p className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {summary ? (
        <pre className="mt-4 overflow-auto rounded-2xl border border-slate-300 bg-slate-50 p-4 text-xs text-slate-700 dark:border-slate-800 dark:bg-[#0b1016] dark:text-slate-300">
          {JSON.stringify(summary, null, 2)}
        </pre>
      ) : null}

      {log.length > 0 ? (
        <pre className="mt-4 max-h-96 overflow-auto rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
          {log.join("\n")}
          <span ref={logEndRef} />
        </pre>
      ) : null}
    </>
  );
}
