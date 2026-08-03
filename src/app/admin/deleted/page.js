// qup-pulse-admin/src/app/admin/deleted/page.js
"use client";

// Messages participants have hidden from their own view. Sits inside the
// /admin layout, so no AppNav and no min-h-screen wrapper.
//
// "Deleted" here means hidden, and the distinction matters: hideMessage adds a
// user's id to the message's hiddenFor array and every PARTICIPANT read filters
// on it. The document is never modified and never removed. That is why this
// page can exist at all — and why the text shown is the original, not a
// tombstone.
//
// The other party still has their copy. Hiding is one-sided by design, so a
// message listed here is very likely still sitting in someone's inbox.
//
// THREE MEANINGS OF "DELETED" NOW COLLIDE ON THIS PAGE, and the nav label does
// not help. A row here is a message a PARTICIPANT hid. The Remove button below
// performs a MODERATOR removal, which is a different mechanism with different
// effects. And /admin/removed lists the results of that. Renaming this page to
// "Hidden by users" and that one to "Removed by moderators" would end the
// ambiguity; until then the badges on each row are doing that work.
//
// PRIVACY: this is a standing, browsable list of private message text with no
// report justifying any individual read — unlike the conversation viewer,
// which is reached from a specific complaint. The notice below stays visible
// for that reason. Hiding a message is an ordinary, innocent action most of
// the time: people delete typos, change their minds, tidy a thread. Reading
// this list looking for wrongdoing will mostly find none.
//
// That last point applies with more force now that this page can ACT. A
// browsable list is one thing; a browsable list with a Remove button on every
// row invites moderating things nobody complained about. The button is here
// because a moderator who spots something genuinely bad should not have to go
// find a report first — but the honest description of this page is still a
// list of ordinary behaviour, and it should be read that way.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminListHiddenMessages } from "../../../lib/adminChatApi";
import MessageModerationControls from "../../../components/admin/MessageModerationControls";
import { useLang } from "../../../context/LandingLang";

export default function AdminDeletedMessagesPage() {
  const { t } = useLang();
  const a = t.app.admin || {};
  const p = t.app.profile;
  const s = t.app.settings;

  const [messages, setMessages] = useState(null);
  const [error, setError] = useState("");

  // Refetch rather than patch a row locally after an action: the server
  // recomputes the conversation preview on both remove and restore, so a
  // locally patched row would be showing a stale one.
  const load = useCallback(async () => {
    try {
      const res = await adminListHiddenMessages();
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
        {a.deletedMessages || "Hidden by users"}
      </h1>

      <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
        {a.deletedMessagesNotice ||
          "Messages a participant has hidden from their own view. The message itself is unchanged and is still visible to the other party. Hiding is usually ordinary housekeeping, not evidence of anything."}
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
        <p className="mt-6 text-sm text-slate-400 dark:text-slate-600">
          {a.noResults}
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {messages.map((msg) => {
            // Server sends `removed` on each row. Falling back to the raw
            // subdocument keeps this working if a row ever arrives straight
            // from toAdmin() without the flattened flag.
            const isRemoved = Boolean(msg.removed || msg.removedByAdmin?.at);

            return (
              <li
                key={msg.id}
                className="rounded-2xl border border-slate-300 bg-white p-5 dark:border-slate-800 dark:bg-[#131c26]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    @{msg.sender?.username || msg.sender?.displayName || "—"}
                  </span>
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-500/20 dark:text-amber-300">
                    {a.hiddenBadge || "Hidden"}
                  </span>
                  {/* Both states can be true at once. Without this badge the
                      row would offer Restore with no indication of why, which
                      reads as a bug. */}
                  {isRemoved ? (
                    <span className="rounded-full bg-red-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-900 dark:bg-red-500/20 dark:text-red-300">
                      {a.removedBadge || "Removed"}
                    </span>
                  ) : null}
                  <span className="ml-auto text-xs text-slate-400 dark:text-slate-600">
                    {new Date(msg.createdAt).toLocaleString()}
                  </span>
                </div>

                {/* Original text. Not a tombstone — neither hiding nor removal
                    ever touched it. */}
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

                {/* WHO hid it is the useful part. A recipient hiding something
                    they were sent reads very differently from a sender hiding
                    their own message — and neither is proof of anything. */}
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-600">
                  {a.hiddenByLabel || "Hidden by"}:{" "}
                  {(msg.hiddenByUsers || []).length
                    ? msg.hiddenByUsers
                        .map((u) => `@${u.username || u.displayName || "—"}`)
                        .join(", ")
                    : `${msg.hiddenCount || 0}`}
                </p>

                {isRemoved && msg.removedReason ? (
                  <p className="mt-1 whitespace-pre-wrap text-xs italic text-slate-500 dark:text-slate-400">
                    {a.removedReasonLabel || "Reason"}: {msg.removedReason}
                  </p>
                ) : null}

                <MessageModerationControls
                  messageId={msg.id}
                  removed={isRemoved}
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
            );
          })}
        </ul>
      )}
    </>
  );
}
