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
//
// STATUS VOCABULARY comes from REPORT_STATUS in server/src/models/Report.js:
// 'open' | 'reviewed' | 'dismissed'. This page previously used 'pending' and
// 'resolved', which broke three things at once and silently:
//
//   - ?status=pending is not a valid value, so listReports fell through to an
//     empty filter and returned EVERY report regardless of the selected tab
//   - resolveReport validates against REPORT_STATUS and 400'd on 'resolved',
//     so the Resolve button could never succeed
//   - the action row was gated on `status === 'pending'`, and reports arrive
//     as 'open', so Resolve and Dismiss NEVER RENDERED on any report at all
//
// The tab labels still read Pending/Resolved because that is the moderator's
// language; only the values sent to the API changed.
//
// REPORT CONTENT: a report carries exactly one of `post` or `message`, or
// neither (a bare user report). The content block below branches on that. It
// used to read `report.details || report.description` — neither of which the
// server sends; the field is `note` — so no report of any kind ever showed its
// content, and a message report showed an empty card.
//
// A message report also links to the full thread, because one line lifted out
// of a conversation is usually unjudgeable.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "../../../lib/api";
import { useLang } from "../../../context/LandingLang";

// Server values, not display labels. See REPORT_STATUS.
const STATUS_OPEN = "open";
const STATUS_REVIEWED = "reviewed";
const STATUS_DISMISSED = "dismissed";

export default function AdminReportsPage() {
  const { t } = useLang();
  const a = t.app.admin || {};
  const nav = t.app.nav || {};
  const p = t.app.profile;
  const s = t.app.settings;

  const [status, setStatus] = useState(STATUS_OPEN);
  const [reports, setReports] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState({});

  const filters = [
    { value: STATUS_OPEN, label: a.filterPending },
    { value: STATUS_REVIEWED, label: a.filterResolved },
    { value: STATUS_DISMISSED, label: a.filterDismissed },
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
      // Drop it from the current view rather than refetching — on a filtered
      // tab it no longer belongs here, and a refetch would reorder everything
      // the moderator is working through.
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
            // Reports arrive as 'open'. The `!report.status` fallback covers a
            // controller that omits the field entirely.
            const actionable = !report.status || report.status === STATUS_OPEN;

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

                <ReportedContent report={report} a={a} />

                {/* The reporter's own words. The server field is `note`; the
                    two older names are kept as fallbacks in case an earlier
                    controller is still deployed somewhere. */}
                {report.note || report.details || report.description ? (
                  <div className="mt-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-600">
                      {a.reporterNote || "Note"}
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {report.note || report.details || report.description}
                    </p>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {actionable ? (
                    <>
                      <button
                        type="button"
                        onClick={() => resolve(report, STATUS_REVIEWED)}
                        disabled={busy}
                        className="rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-emerald-950 transition hover:brightness-105 disabled:opacity-50"
                      >
                        {a.resolve}
                      </button>
                      <button
                        type="button"
                        onClick={() => resolve(report, STATUS_DISMISSED)}
                        disabled={busy}
                        className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        {a.dismiss}
                      </button>
                    </>
                  ) : null}

                  {/* Only rendered for message reports. That is deliberate:
                      the conversation viewer is a privileged read of private
                      messages, and a report is the justification for opening
                      it. Nothing else in the admin UI should link there. */}
                  {report.message && report.conversationId ? (
                    <Link
                      href={`/admin/conversations/${encodeURIComponent(
                        report.conversationId,
                      )}?highlight=${encodeURIComponent(report.message.id)}`}
                      className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-600 no-underline transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {a.viewThread || "View conversation"}
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

// The thing being complained about. Exactly one of message/post is set; a bare
// user report has neither and renders nothing, which is correct — the
// complaint is about the account, and the header already names it.
//
// A MESSAGE report shows snapshotText: the text AS IT WAS when reported, taken
// on the server at report time. Not the live document — messages are not
// editable today, but a report that re-reads the source would become worthless
// the day they are.
//
// hiddenCount is context, NOT evidence. It means a participant removed the
// message from their own view, which is neither an admission nor a defence —
// hiding is per-user and never touches the document, which is why the text is
// still here to read.
function ReportedContent({ report, a }) {
  const msg = report.message;
  const post = report.post;

  if (!msg && !post) return null;

  const label = msg
    ? a.reportedMessage || "Reported message"
    : a.reportedPost || "Reported post";

  const body = msg ? msg.text : post.text;

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#0b1016]">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-600">
        {label}
      </p>

      {body ? (
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
          {body}
        </p>
      ) : (
        <p className="mt-1 text-sm italic text-slate-400 dark:text-slate-600">
          —
        </p>
      )}

      {msg?.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={msg.imageUrl}
          alt=""
          className="mt-2 max-h-56 rounded-lg object-cover"
        />
      ) : null}

      {msg?.hiddenCount > 0 ? (
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-600">
          {a.hiddenByParticipant ||
            "Hidden from one or more participants' own view. The message itself is unchanged."}
        </p>
      ) : null}
    </div>
  );
}
