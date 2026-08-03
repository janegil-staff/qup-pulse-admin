// qup-pulse-admin/src/app/admin/removed/page.js
"use client";

// Messages a MODERATOR has taken down. Sits inside the /admin layout, so no
// AppNav and no min-h-screen wrapper.
//
// Not the same page as /admin/deleted, and the difference is the whole point:
//
//   /admin/deleted   messages a PARTICIPANT hid from their own view. Per-user,
//                    one-sided, usually innocent, and not a moderation action.
//   /admin/removed   messages THIS TEAM removed. Global, asymmetric, and
//                    already the result of a decision someone made.
//
// WHY IT EXISTS: adminRestoreMessage shipped before anything could route to
// it. A removed message was only reachable if a participant had also hidden it
// or a report happened to point at its conversation — so a moderator who
// removed the wrong message had no way back to it. A reversible tool that
// cannot be reached is a permanent one.
//
// The original text is shown in full because it is never blanked in the
// database; that is the same property restore depends on. Deciding whether to
// put a message back requires reading it.
//
// PRIVACY: unanchored, like /admin/deleted — no report gates any individual
// read. The justification here is narrower and better than on that page:
// every row is content this team already acted on, not private conversation
// surfaced on a hunch. That is why this page does not carry the same standing
// warning; it is not browsing, it is a record of decisions.
//
// The removal reason is only visible HERE, and only until someone restores —
// adminRestoreMessage unsets removedByAdmin entirely, taking the reason and
// the attribution with it. Read before restoring, not after.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminListRemovedMessages } from "../../../lib/adminChatApi";
import MessageModerationControls from "../../../components/admin/MessageModerationControls";
import { useLang } from "../../../context/LandingLang";

export default function AdminRemovedMessagesPage() {
  const { t } = useLang();
  const a = t.app.admin || {};
  const p = t.app.profile;
  const s = t.app.settings;

  const [messages, setMessages] = useState(null);
  const [error, setError] = useState("");

  // useCallback so it can be handed to the controls as onChanged without
  // re-creating on every render and re-firing the effect.
  const load = useCallback(async () => {
    try {
      const res = await adminListRemovedMessages();
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
        {a.removedMessages || "Removed by moderators"}
      </h1>

      <p className="mt-4 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
        {a.removedMessagesNotice ||
          "Messages this team has taken down. Neither participant sees them, and nothing marks their absence — a sender who does not realise may simply send the message again. Restoring puts it back for both and discards the record of who removed it and why."}
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
        // NOTE: this empty state is indistinguishable from a failed fetch that
        // returned 200 with no body. If you are testing removal and see this,
        // check the network tab before assuming nothing was removed.
        <p className="mt-6 text-sm text-slate-400 dark:text-slate-600">
          {a.noRemovedMessages || a.noResults}
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
                <span className="rounded-full bg-red-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-900 dark:bg-red-500/20 dark:text-red-300">
                  {a.removedBadge || "Removed"}
                </span>
                {/* A message can be both removed and hidden. Shown because
                    restoring will NOT bring it back for a participant who hid
                    it themselves — their hide survives, which is correct and
                    catches people out. */}
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

              {/* Original text — never blanked in the database, which is what
                  makes restore return a real message instead of an empty
                  bubble. */}
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
                {a.removedByLabel || "Removed by"}:{" "}
                {msg.removedBy
                  ? `@${msg.removedBy.username || msg.removedBy.displayName || "—"}`
                  : a.removedByUnknown || "unknown (account deleted)"}
                {msg.removedAt
                  ? ` · ${new Date(msg.removedAt).toLocaleString()}`
                  : ""}
              </p>

              {msg.removedReason ? (
                <p className="mt-1 whitespace-pre-wrap text-xs italic text-slate-500 dark:text-slate-400">
                  {a.removedReasonLabel || "Reason"}: {msg.removedReason}
                </p>
              ) : (
                <p className="mt-1 text-xs italic text-slate-400 dark:text-slate-600">
                  {a.removedNoReason || "No reason recorded."}
                </p>
              )}

              <MessageModerationControls
                messageId={msg.id}
                removed
                a={a}
                onChanged={load}
              />

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
