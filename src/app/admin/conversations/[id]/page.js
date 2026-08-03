// qup-pulse-admin/src/app/admin/conversations/[id]/page.js
"use client";

// Moderator's view of a reported conversation. Sits inside the /admin layout,
// so no AppNav and no min-h-screen wrapper.
//
// WHY THIS EXISTS: a single reported line is usually unjudgeable. Whether
// something counts as harassment depends entirely on what came before it — a
// blunt reply to provocation reads very differently from an unprovoked one.
// The queue links here so a decision is made on the exchange, not the excerpt.
//
// UNFILTERED, on both axes. Messages come from Message.toAdmin(), which
// returns the original text regardless of who has hidden it AND regardless of
// whether a moderator has removed it. "Delete for me" adds the user's id to
// hiddenFor and every PARTICIPANT read filters on that; removal sets
// removedByAdmin and participant reads filter on that too. This read does
// neither, which is what makes it the surface where a removal can be undone.
//
// Both states are marked, because a moderator should know which of the three
// things they are looking at:
//
//   plain     nobody has touched it
//   hidden    a participant put it out of their own view. Context, not
//             evidence: neither an admission nor a defence, and either party
//             can hide either party's messages.
//   removed   this team took it down. The sender sees a tombstone here; the
//             recipient's thread does not contain it at all.
//
// ACTING FROM HERE is the intended path. The removed-messages list exists so a
// removal can be found later, but the decision itself is better made with the
// surrounding exchange on screen — which is this page and only this page.
//
// PRIVACY: this is a privileged read of a private conversation with no
// participant check — requireAdmin is the only gate. Reach it from a report.
// Linked from a user detail page or a search box it becomes a general-purpose
// DM viewer for anyone holding the admin flag, which is a different product
// with different obligations.

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { adminGetConversation } from "../../../../lib/adminChatApi";
import MessageModerationControls from "../../../../components/admin/MessageModerationControls";
import { useLang } from "../../../../context/LandingLang";

export default function AdminConversationPage() {
  const params = useParams();
  const search = useSearchParams();
  const id = String(params?.id || "");
  // The queue passes the reported message so it can be picked out of the
  // surrounding exchange without the moderator hunting for it.
  const highlight = search?.get("highlight") || "";

  const { t } = useLang();
  const a = t.app.admin || {};
  const p = t.app.profile;
  const s = t.app.settings;

  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await adminGetConversation(id);
      setData(res);
      setError("");
    } catch (e) {
      setError(e.message || p.loadFailed);
      setData({ conversation: null, messages: [] });
    }
  }, [id, p.loadFailed]);

  useEffect(() => {
    load();
  }, [load]);

  const participants = data?.conversation?.participants || [];
  const byId = new Map(
    participants.filter(Boolean).map((u) => [String(u.id ?? u._id), u]),
  );
  const initiator = String(data?.conversation?.initiator || "");

  return (
    <>
      <Link
        href="/admin/reports"
        className="text-sm font-semibold text-slate-500 no-underline hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
      >
        ← {a.backToReports || "Reports"}
      </Link>

      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        {a.conversationTitle || "Conversation"}
      </h1>

      {participants.length ? (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {participants
            .filter(Boolean)
            .map((u) => `@${u.username || u.displayName || "—"}`)
            .join(" · ")}
          {data?.conversation?.status ? ` · ${data.conversation.status}` : ""}
        </p>
      ) : null}

      {/* Standing reminder. This page reads private messages between two
          people who did not consent to a moderator reading them; the
          justification is a specific report, and it does not extend further
          than that. */}
      <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
        {a.moderationPrivacyNotice ||
          "Private conversation, shown for moderating a specific report. Includes messages a participant has hidden from their own view, and messages removed by moderators that neither participant can now see."}
      </p>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {data === null ? (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          {s.loading}
        </p>
      ) : data.messages.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400 dark:text-slate-600">
          {a.noResults}
        </p>
      ) : (
        <ol className="mt-5 space-y-2">
          {data.messages.map((msg) => {
            const senderId = String(msg.sender?.id ?? msg.sender ?? "");
            const sender = byId.get(senderId) || msg.sender || {};
            const isHighlighted =
              highlight && String(msg.id) === String(highlight);
            const isHidden = (msg.hiddenCount || 0) > 0;
            // Tolerates either shape from toAdmin(): a flattened `removed`
            // boolean or the raw removedByAdmin subdocument. Written this way
            // because toAdmin's exact output has not been verified against a
            // running server.
            const isRemoved = Boolean(msg.removed || msg.removedByAdmin?.at);
            const removedReason =
              msg.removedReason || msg.removedByAdmin?.reason || "";
            const removedAt = msg.removedAt || msg.removedByAdmin?.at || null;

            return (
              <li
                key={msg.id}
                className={
                  "rounded-xl border p-3 " +
                  (isHighlighted
                    ? "border-red-400 bg-red-50 dark:border-red-500/50 dark:bg-red-500/10"
                    : isRemoved
                      ? "border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800/40"
                      : "border-slate-200 bg-white dark:border-slate-800 dark:bg-[#131c26]")
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    @{sender.username || sender.displayName || "—"}
                  </span>
                  {senderId && senderId === initiator ? (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {a.initiatorBadge || "Opened thread"}
                    </span>
                  ) : null}
                  {isHidden ? (
                    <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-500/20 dark:text-amber-300">
                      {a.hiddenBadge || "Hidden"}
                    </span>
                  ) : null}
                  {isRemoved ? (
                    <span className="rounded-full bg-red-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-900 dark:bg-red-500/20 dark:text-red-300">
                      {a.removedBadge || "Removed"}
                    </span>
                  ) : null}
                  <span className="ml-auto text-xs text-slate-400 dark:text-slate-600">
                    {new Date(msg.createdAt).toLocaleString()}
                  </span>
                </div>

                {msg.text ? (
                  <p
                    className={
                      "mt-1.5 whitespace-pre-wrap text-sm leading-relaxed " +
                      (isRemoved
                        ? "text-slate-500 line-through decoration-slate-400/60 dark:text-slate-400"
                        : "text-slate-800 dark:text-slate-200")
                    }
                  >
                    {msg.text}
                  </p>
                ) : null}

                {msg.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={msg.imageUrl}
                    alt=""
                    className={
                      "mt-2 max-h-56 rounded-lg object-cover " +
                      (isRemoved ? "opacity-50" : "")
                    }
                  />
                ) : null}

                {isHidden ? (
                  <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-600">
                    {a.hiddenByParticipant ||
                      "Hidden from one or more participants' own view. The message itself is unchanged."}
                  </p>
                ) : null}

                {isRemoved ? (
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {a.removedByModerator ||
                      "Removed by a moderator. Neither participant sees this message; it appears here only because this view is unfiltered."}
                    {removedAt
                      ? ` · ${new Date(removedAt).toLocaleString()}`
                      : ""}
                    {removedReason ? ` · ${removedReason}` : ""}
                  </p>
                ) : null}

                <MessageModerationControls
                  messageId={msg.id}
                  removed={isRemoved}
                  a={a}
                  onChanged={load}
                />
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
