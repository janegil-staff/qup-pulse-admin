// qup-pulse-admin/src/components/admin/MessageModerationControls.js
"use client";

// Remove / Restore for a single message. Used by three surfaces — the hidden
// list, the removed list, and the conversation viewer — deliberately as ONE
// component rather than three copies.
//
// The reason for sharing is not line count. Removal is asymmetric and
// reversible, and the wording that explains that to a moderator is the part
// most likely to drift if it is written out three times. A moderator who reads
// "the recipient will no longer see this" on one page and nothing on another
// is being told two different things about the same action.
//
// REMOVE requires a confirm step with a free-text reason, rather than firing
// on the first click. The reason is the only durable record of why — and it
// does not survive a restore, so it is the moderator's note to the next
// moderator, not an audit log. Named as such in the placeholder so nobody
// mistakes it for one.
//
// RESTORE confirms too, but without a field. Restoring is the recoverable
// direction; the thing worth pausing on is that it discards the removal
// record, which the caller shows above this component.
//
// onChanged() is called after either action succeeds so the parent can refetch
// rather than patch its own row. Refetching is slower and correct: the server
// recomputes the conversation preview on both actions, and a locally patched
// row would show a stale one.

import { useState } from "react";
import {
  adminRemoveMessage,
  adminRestoreMessage,
} from "../../lib/adminChatApi";

export default function MessageModerationControls({
  messageId,
  removed = false,
  a = {},
  onChanged,
}) {
  // "idle" | "confirmRemove" | "confirmRestore"
  const [mode, setMode] = useState("idle");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
      setMode("idle");
      setReason("");
      if (onChanged) await onChanged();
    } catch (e) {
      // Left on screen rather than cleared on the next click: a moderator who
      // gets a 500 here needs to know the action did NOT take, because the row
      // will look unchanged either way.
      setError(e.message || "Request failed");
    } finally {
      setBusy(false);
    }
  }

  const btn =
    "rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";

  if (mode === "confirmRemove") {
    return (
      <div className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 dark:border-red-500/40 dark:bg-red-500/10">
        <p className="text-xs leading-relaxed text-red-800 dark:text-red-300">
          {a.removeConfirmBody ||
            "Neither participant will see this message afterwards. Nothing marks its absence, so the sender may not realise and may send it again. This can be undone."}
        </p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder={
            a.removeReasonPlaceholder ||
            "Reason — a note for the next moderator. Not shown to either participant, and discarded if this is restored."
          }
          className="mt-2 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-red-500/40 dark:bg-[#131c26] dark:text-slate-200"
        />

        {error ? (
          <p className="mt-2 text-xs font-semibold text-red-700 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => adminRemoveMessage(messageId, { reason }))}
            className={`${btn} border-red-500 bg-red-600 text-white hover:bg-red-700`}
          >
            {busy
              ? a.working || "Working…"
              : a.removeConfirmAction || "Remove message"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setMode("idle");
              setError("");
            }}
            className={`${btn} border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800`}
          >
            {a.cancel || "Cancel"}
          </button>
        </div>
      </div>
    );
  }

  if (mode === "confirmRestore") {
    return (
      <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-500/40 dark:bg-emerald-500/10">
        <p className="text-xs leading-relaxed text-emerald-900 dark:text-emerald-300">
          {a.restoreConfirmBody ||
            "The message returns to both threads. The record of who removed it and why is discarded. A participant who also hid it for themselves will still not see it."}
        </p>

        {error ? (
          <p className="mt-2 text-xs font-semibold text-red-700 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => adminRestoreMessage(messageId))}
            className={`${btn} border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-700`}
          >
            {busy
              ? a.working || "Working…"
              : a.restoreConfirmAction || "Restore message"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setMode("idle");
              setError("");
            }}
            className={`${btn} border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800`}
          >
            {a.cancel || "Cancel"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      {error ? (
        <p className="mb-2 text-xs font-semibold text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {removed ? (
        <button
          type="button"
          onClick={() => setMode("confirmRestore")}
          className={`${btn} border-emerald-400 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/50 dark:text-emerald-300 dark:hover:bg-emerald-500/10`}
        >
          {a.restore || "Restore"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setMode("confirmRemove")}
          className={`${btn} border-red-400 text-red-700 hover:bg-red-50 dark:border-red-500/50 dark:text-red-300 dark:hover:bg-red-500/10`}
        >
          {a.remove || "Remove"}
        </button>
      )}
    </div>
  );
}
