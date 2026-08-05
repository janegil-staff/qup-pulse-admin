// qup-pulse-admin/src/app/admin/retracted/page.js
"use client";

// Messages a SENDER withdrew. Sits inside the /admin layout, so no AppNav and
// no min-h-screen wrapper.
//
// The fourth message surface, and the last one to get a page:
//
//   /admin/deleted    a PARTICIPANT hid it from their own view. Per-user,
//                     one-sided, invisible to the other party, not a
//                     moderation action.
//   /admin/removed    THIS TEAM took it down. Global, reversible, attributed.
//   /admin/retracted  the SENDER withdrew it. Global, IRREVERSIBLE, and the
//                     only one of the three the moderated party controls.
//
// WHY IT EXISTS. retractMessage refuses once a Report references the message,
// so a reported message cannot be withdrawn — that protection is already in
// place. But a message retracted BEFORE anyone reported it was unreachable
// from every moderation surface while its text sat untouched in the database.
// "Send abuse, retract immediately" should not be a way to put something
// beyond review.
//
// NO RESTORE, deliberately, and this page must never grow one. Retraction is
// irreversible by decision: the confirm dialog tells the sender so, and an
// un-retract would let someone remove and restore a message around a
// moderator's read of it. Reading is the whole capability here.
//
// PRIVACY: unanchored. No report gates any individual read, and unlike
// /admin/removed these rows are not decisions this team already made — they
// are other people's private messages, surfaced because the sender tried to
// take them back. That is the weakest justification of the four surfaces,
// which is why this page carries the standing warning and /admin/removed does
// not.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminListRetractedMessages } from "../../../lib/adminChatApi";
import { useLang } from "../../../context/LandingLang";

export default function AdminRetractedMessagesPage() {
  const { t } = useLang();
  const a = t.app.admin || {};
  const p = t.app.profile;
  const s = t.app.settings;

  const [messages, setMessages] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await adminListRetractedMessages();
      setMessages(res.messages);
      setError("");
    } catch (e) {
      setError(e.message || p.loadFailed);
      setMessages([]);
    }
  }, [p.loadFailed]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        {a.retractedMessages || "Retracted"}
      </h1>

      <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
        {a.retractedMessagesNotice ||
          "Messages senders withdrew. Neither participant can see them any more, and the sender was told the action was permanent. Nothing here can be restored. This is a privileged read of private messages that no report has been filed against — open it to answer a complaint, not to browse."}
      </p>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {messages === null ? (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          {s.loading}
        </p>
      ) : messages.length === 0 ? (
        // NOTE: indistinguishable from a fetch that returned 200 with no body.
        // If you are testing retraction and see this, check the network tab
        // before assuming nothing was retracted.
        <p className="mt-6 text-sm text-slate-400 dark:text-slate-600">
          {a.noRetractedMessages || a.noResults}
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {messages.map((msg) => (
            <li
              key={msg.id}
              className="rounded-2xl border border-slate-300 bg-white p-5 dark:border-slate-800 dark:bg-[#131c26]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  @{msg.sender?.username || msg.sender?.displayName || "—"}
                </span>
                <span className="rounded-full bg-purple-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-900 dark:bg-purple-500/20 dark:text-purple-300">
                  {a.retractedBadge || "Retracted"}
                </span>

                {/* Retracted AND reported means the report came SECOND —
                    retractMessage refuses once a Report exists. So the
                    recipient complained about something already withdrawn,
                    and the thread a moderator opens will not contain it. This
                    row is the only place the text still surfaces. */}
                {msg.isReported ? (
                  <span className="rounded-full bg-red-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-900 dark:bg-red-500/20 dark:text-red-300">
                    {a.reportedAfterBadge || "Reported after"}
                  </span>
                ) : null}

                {(msg.hiddenCount || 0) > 0 ? (
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-500/20 dark:text-amber-300">
                    {a.hiddenBadge || "Hidden"}
                  </span>
                ) : null}

                <span className="ml-auto text-xs text-slate-400 dark:text-slate-600">
                  {msg.createdAt
                    ? new Date(msg.createdAt).toLocaleString()
                    : ""}
                </span>
              </div>

              {/* Original text — never blanked on retraction, the same
                  property that keeps a removed message readable. */}
              {msg.text ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                  {msg.text}
                </p>
              ) : null}

              {msg.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={msg.imageUrl}
                  alt=""
                  className="mt-2 max-h-56 rounded-lg object-cover"
                />
              ) : null}

              <p className="mt-2 text-xs text-slate-400 dark:text-slate-600">
                {a.retractedAtLabel || "Retracted"}:{" "}
                {msg.retractedAt
                  ? new Date(msg.retractedAt).toLocaleString()
                  : "—"}
              </p>

              {/* No moderation controls. Retraction cannot be undone, and
                  removing an already-invisible message would only confuse the
                  record. If the account needs action, that is a ban, not a
                  message-level tool. */}

              {msg.conversationId ? (
                <div className="mt-3">
                  <Link
                    href={`/admin/conversations/${encodeURIComponent(
                      msg.conversationId,
                    )}?highlight=${encodeURIComponent(msg.id)}`}
                    className="inline-block rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-600 no-underline transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {a.viewThread || "View conversation"}
                  </Link>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
