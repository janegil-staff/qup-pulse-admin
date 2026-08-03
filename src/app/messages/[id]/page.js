// qup-pulse-admin/src/app/messages/[id]/page.js
"use client";

// Thread view — history + send via REST, live receive via Socket.IO.
//
// REST:   GET  /chat/conversations/:id/messages?before=
//         POST /chat/conversations/:id/messages | /read | /accept
//         POST /chat/messages/:id/hide | /unhide | /retract | /unretract | /report
//         POST /upload (multipart, field "image")
//
// Socket: chat:join {conversationId} -> ack { ok } | { error }   REQUIRED
//         chat:typing / chat:leave
//         chat:message            <- toClient(), every message in the room
//         chat:typing             <- { userId }
//         chat:accepted           <- { conversationId, status }
//         chat:message:retracted  <- { conversationId, messageId }
//         chat:message:unretracted<- { conversationId, messageId }
//
// WHO AM I — there is no client-side answer here, deliberately. This page used
// to decode the JWT for `sub`, but the token signs the id as `id`
// (currentUserId() on the server reads `req.user.id || req.user.sub` for
// exactly that reason). Reading `.sub` yielded the STRING "undefined", which
// passed every `!= null` guard and then matched no sender — so every bubble
// rendered as someone else's and the thread collapsed onto one side.
//
// The fix is not a better guess at the claim name. In a TWO-PERSON thread the
// server already says who the other participant is, so a message is mine iff
// its sender is not them. That answer arrives with the messages and cannot
// drift from them. If group threads land, this becomes wrong and the server
// should return `me` in the envelope instead.
//
// THREE WAYS A MESSAGE DISAPPEARS, and the UI must not blur them:
//
//   hide      THEIR message, my view only. They keep their copy — which is
//             what keeps it reportable and intact for moderation.
//   retract   MY message, gone for both, no tombstone. CONFIRMED first,
//             because it reaches into someone else's thread.
//   removed   a moderator's decision. I see a tombstone if I sent it;
//             otherwise the server never sends it to me at all.
//
// Hide is NOT confirmed: it affects one view, is undoable without limit, and a
// modal on every tidy-up would be pure friction. Retract is confirmed because
// it is the one action whose effect lands on another person.
//
// The confirm text says three true things — gone for both, undoable for a
// short while, and a copy is retained for moderation. That last one matters:
// "delete for everyone" otherwise implies the message has left the world, and
// it has not.

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getToken } from "../../../lib/api";
import { useLang } from "../../../context/LandingLang";
import AppNav from "../../../components/AppNav";
import {
  getMessages,
  markRead,
  acceptConversation,
  sendMessage,
  hideMessage,
  unhideMessage,
  retractMessage,
  unretractMessage,
  reportMessage,
} from "../../../lib/chatApi";
import { uploadImage } from "../../../lib/profileSettingsApi";
import { getSocket } from "../../../lib/socket";

const TYPING_TTL_MS = 3000;
const TYPING_EMIT_EVERY_MS = 1000;
// Must not exceed RETRACT_UNDO_MS on the server, or the toast offers an undo
// the API will refuse. Slightly under, to cover the round trip.
const UNDO_TOAST_MS = 28 * 1000;

// Mirrors REPORT_REASONS in server/src/models/Report.js.
const REPORT_REASONS = [
  { value: "spam", key: "reasonSpam" },
  { value: "harassment", key: "reasonHarassment" },
  { value: "inappropriate", key: "reasonInappropriate" },
  { value: "misinformation", key: "reasonMisinformation" },
  { value: "other", key: "reasonOther" },
];

const byTime = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);

export default function ThreadPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id || "");
  const { t } = useLang();
  const m = t.app.messages;
  const s = t.app.settings;

  const [ready, setReady] = useState(false);
  const [convo, setConvo] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [theyreTyping, setTheyreTyping] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [reportFor, setReportFor] = useState(null);
  // The message awaiting retract confirmation. Held whole, so the dialog can
  // show what is about to go.
  const [retractFor, setRetractFor] = useState(null);
  // { kind: 'hide' | 'retract', message } — holds the removed message so undo
  // can put it straight back without a refetch.
  const [undo, setUndo] = useState(null);
  const [gateHit, setGateHit] = useState(false);

  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const undoTimer = useRef(null);
  const lastTypingEmit = useRef(0);

  // The one identity fact this page needs. Everything else follows from it.
  const otherId = otherUser ? String(otherUser.id ?? otherUser._id) : null;
  const isMine = useCallback(
    (msg) => {
      const sid = String(msg?.sender?.id ?? msg?.sender ?? "");
      // Before otherUser loads, claim nothing rather than claiming everything.
      return otherId ? sid !== otherId : false;
    },
    [otherId],
  );

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const load = useCallback(async () => {
    const raw = await getMessages(id);
    const list = Array.isArray(raw) ? raw : raw?.messages || [];
    const meta = Array.isArray(raw) ? null : raw;
    setMessages(list);
    setOtherUser(meta?.otherUser || null);
    setConvo(meta?.conversation || null);
  }, [id]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        await load();
        if (cancelled) return;
        markRead(id)
          .then(() => window.dispatchEvent(new Event("chat:read")))
          .catch(() => {});
      } catch (e) {
        if (!cancelled) setError(e.message || m.loadFailed);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, router, load, m.loadFailed]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !id) return;

    // The ack is not optional. A rejected join (not a participant, blocked, or
    // no such thread) is the ONLY signal we get.
    socket.emit("chat:join", { conversationId: id }, (ack) => {
      if (ack?.error) setError(ack.error || m.joinFailed);
    });

    const onMessage = (msg) => {
      if (String(msg.conversationId) !== id) return;
      const theirs = otherId && String(msg.sender?.id) === otherId;

      if (theirs) {
        clearTimeout(typingTimer.current);
        setTheyreTyping(false);
        // Their reply accepts the thread server-side, so the gate is gone.
        setConvo((prev) =>
          prev && prev.status === "pending"
            ? {
                ...prev,
                status: "accepted",
                canSend: true,
                sendBlockedReason: null,
              }
            : prev,
        );
        setGateHit(false);
      }

      setMessages((prev) =>
        prev.some((x) => String(x.id) === String(msg.id))
          ? prev
          : [...prev, msg].sort(byTime),
      );
    };

    const onTyping = (payload) => {
      const from = payload?.userId;
      const convoId = payload?.conversationId;
      if (convoId != null && String(convoId) !== id) return;
      // Only the other participant's ping counts. Without otherId yet, ignore.
      if (!otherId || (from != null && String(from) !== otherId)) return;

      setTheyreTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(
        () => setTheyreTyping(false),
        TYPING_TTL_MS,
      );
    };

    const onAccepted = ({ conversationId, status }) => {
      if (String(conversationId) !== id) return;
      setConvo((prev) =>
        prev
          ? {
              ...prev,
              status: status || "accepted",
              canSend: true,
              sendBlockedReason: null,
            }
          : prev,
      );
      setGateHit(false);
    };

    // Someone retracted. Drop it — this reaches BOTH parties, including the
    // sender's other tabs.
    const onRetracted = ({ conversationId, messageId }) => {
      if (String(conversationId) !== id) return;
      setMessages((prev) =>
        prev.filter((x) => String(x.id) !== String(messageId)),
      );
    };

    // Undone. The recipient's client discarded the message and has no copy to
    // restore, so refetch rather than trying to reconstruct it.
    const onUnretracted = ({ conversationId }) => {
      if (String(conversationId) !== id) return;
      load().catch(() => {});
    };

    socket.on("chat:message", onMessage);
    socket.on("chat:typing", onTyping);
    socket.on("chat:accepted", onAccepted);
    socket.on("chat:message:retracted", onRetracted);
    socket.on("chat:message:unretracted", onUnretracted);

    return () => {
      socket.off("chat:message", onMessage);
      socket.off("chat:typing", onTyping);
      socket.off("chat:accepted", onAccepted);
      socket.off("chat:message:retracted", onRetracted);
      socket.off("chat:message:unretracted", onUnretracted);
      socket.emit("chat:leave", { conversationId: id });
      clearTimeout(typingTimer.current);
    };
  }, [id, otherId, load, m.joinFailed]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, theyreTyping, scrollToBottom]);

  useEffect(() => () => clearTimeout(undoTimer.current), []);

  function pingTyping() {
    const now = Date.now();
    if (now - lastTypingEmit.current < TYPING_EMIT_EVERY_MS) return;
    lastTypingEmit.current = now;
    getSocket()?.emit("chat:typing", { conversationId: id });
  }

  function offerUndo(kind, message) {
    clearTimeout(undoTimer.current);
    setUndo({ kind, message });
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_TOAST_MS);
  }

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      setText("");
      const { message } = await sendMessage(id, { text: body });
      if (message) {
        setMessages((prev) =>
          prev.some((x) => String(x.id) === String(message.id))
            ? prev
            : [...prev, message].sort(byTime),
        );
      }
      // The opener is used. The server would say the same on the next load;
      // updating locally locks the composer immediately.
      setConvo((prev) =>
        prev &&
        prev.status === "pending" &&
        otherId &&
        String(prev.initiator) !== otherId
          ? { ...prev, canSend: false, sendBlockedReason: "chatPendingLimit" }
          : prev,
      );
    } catch (e) {
      setText(body);
      if (e?.status === 403) {
        setGateHit(true);
        setError("");
      } else {
        setError(e.message || m.sendFailed);
      }
    } finally {
      setSending(false);
    }
  }

  async function sendImage(file) {
    setUploading(true);
    setError("");
    try {
      const { url } = await uploadImage(file);
      const { message } = await sendMessage(id, { imageUrl: url });
      if (message) {
        setMessages((prev) =>
          prev.some((x) => String(x.id) === String(message.id))
            ? prev
            : [...prev, message].sort(byTime),
        );
      }
    } catch (e) {
      setError(e.message || m.sendFailed);
    } finally {
      setUploading(false);
    }
  }

  // THEIR message, my view only. No confirmation: one view, undoable without
  // limit. Removed from local state only after the server confirms, so a
  // failure leaves the thread as it was.
  async function hide(msg) {
    if (busyId) return;
    setBusyId(msg.id);
    setError("");
    try {
      await hideMessage(msg.id);
      setMessages((prev) =>
        prev.filter((x) => String(x.id) !== String(msg.id)),
      );
      offerUndo("hide", msg);
    } catch (e) {
      setError(e.message || m.hideFailed);
    } finally {
      setBusyId(null);
    }
  }

  // MY message, gone for both. Reached only through the confirm dialog.
  async function retract(msg) {
    setRetractFor(null);
    if (busyId) return;
    setBusyId(msg.id);
    setError("");
    try {
      await retractMessage(msg.id);
      setMessages((prev) =>
        prev.filter((x) => String(x.id) !== String(msg.id)),
      );
      offerUndo("retract", msg);
    } catch (e) {
      // 409 = already reported. The server sends a translation key, not a
      // sentence, because "someone has reported this" is a thing the user
      // needs told clearly rather than a raw failure.
      setError(
        e?.status === 409
          ? m[e.message] || m.retractReported
          : e.message || m.retractFailed,
      );
    } finally {
      setBusyId(null);
    }
  }

  async function doUndo() {
    if (!undo) return;
    const { kind, message } = undo;
    clearTimeout(undoTimer.current);
    setUndo(null);
    setError("");
    try {
      if (kind === "hide") await unhideMessage(message.id);
      else await unretractMessage(message.id);
      setMessages((prev) =>
        prev.some((x) => String(x.id) === String(message.id))
          ? prev
          : [...prev, message].sort(byTime),
      );
    } catch (e) {
      // 409 = the window closed between the toast rendering and the click.
      setError(
        e?.status === 409
          ? m[e.message] || m.undoWindowClosed
          : e.message || m.undoFailed,
      );
    }
  }

  async function submitReport({ reason, note }) {
    try {
      await reportMessage(reportFor, { reason, note });
      setReportFor(null);
      setNotice(m.reportSent);
    } catch (e) {
      setError(e.message || m.reportFailed);
      setReportFor(null);
    }
  }

  async function accept() {
    setError("");
    try {
      const r = await acceptConversation(id);
      setConvo((prev) =>
        prev
          ? {
              ...prev,
              status: r.status || "accepted",
              canSend: true,
              sendBlockedReason: null,
            }
          : prev,
      );
    } catch (e) {
      setError(e.message || m.acceptFailed);
    }
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-500 dark:bg-[#0b1016] dark:text-slate-400">
        {s.loading}
      </div>
    );
  }

  const u = otherUser;
  const name = u?.displayName || u?.username || m.unknownUser;
  const avatar = u?.avatarUrl || u?.photos?.[0]?.url || "";

  // Derived from otherUser for the same reason as isMine: no token decoding.
  const isInitiator =
    convo != null && otherId != null && String(convo.initiator) !== otherId;

  const showAccept =
    convo?.status === "pending" && !isInitiator && messages.length > 0;
  const canSendImage = convo?.status === "accepted";
  const showPhotoNote = Boolean(convo) && !canSendImage;
  const composerLocked = convo?.canSend === false || gateHit;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-100">
      <AppNav />

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-6">
        <div className="mb-3 flex items-center gap-3">
          <Link
            href="/messages"
            className="text-sm font-semibold text-slate-500 no-underline hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
          >
            ←
          </Link>
          <div className="relative shrink-0">
            <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-semibold">
                  {name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            {u?.online ? (
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400 dark:border-[#0b1016]" />
            ) : null}
          </div>
          <div className="min-w-0">
            {u?.username ? (
              <Link
                href={`/profile/${encodeURIComponent(u.username)}`}
                className="truncate text-[15px] font-bold text-slate-900 no-underline hover:underline dark:text-white"
              >
                {name}
              </Link>
            ) : (
              <span className="truncate text-[15px] font-bold text-slate-900 dark:text-white">
                {name}
              </span>
            )}
          </div>
        </div>

        {error ? (
          <p className="mb-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {notice ? (
          <p className="mb-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
            {notice}
          </p>
        ) : null}

        {showAccept ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-800 dark:bg-[#131c26]">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {m.pendingBody}
            </p>
            <button
              type="button"
              onClick={accept}
              className="shrink-0 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-sm font-semibold text-emerald-950 transition hover:brightness-105"
            >
              {m.accept}
            </button>
          </div>
        ) : null}

        <div className="flex-1 space-y-2 overflow-y-auto rounded-2xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#131c26] dark:shadow-none">
          {messages.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              {m.noMessagesYet}
            </p>
          ) : (
            messages.map((msg) => (
              <Bubble
                key={msg.id}
                msg={msg}
                m={m}
                mine={isMine(msg)}
                busy={String(busyId) === String(msg.id)}
                onHide={hide}
                onRetract={setRetractFor}
                onReport={setReportFor}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <TypingDots visible={theyreTyping} label={m.typing} />

        {composerLocked ? (
          <div
            id="send-gate-note"
            className="mt-3 rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-800 dark:bg-[#131c26]"
          >
            <p className="text-[15px] font-bold text-slate-900 dark:text-white">
              {m.awaitingReplyTitle}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {m[convo?.sendBlockedReason] || m.awaitingReplyBody}
            </p>
          </div>
        ) : null}

        {showPhotoNote && !composerLocked ? (
          <p
            id="photo-gate-note"
            className="mt-3 flex items-start gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400"
          >
            <span aria-hidden="true">📷</span>
            {m.photoPendingNote || m.photoPending}
          </p>
        ) : null}

        <div className="mt-3 flex items-center gap-2">
          <label
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-slate-300 text-xl font-semibold transition dark:border-slate-700 ${
              canSendImage
                ? "cursor-pointer text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                : "cursor-not-allowed text-slate-300 dark:text-slate-700"
            }`}
            aria-label={m.addImage || "+"}
            aria-describedby={showPhotoNote ? "photo-gate-note" : undefined}
          >
            {uploading ? "…" : "+"}
            <input
              type="file"
              accept="image/*"
              disabled={!canSendImage || uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = ""; // reset so the same file can be picked twice
                if (f) sendImage(f);
              }}
              className="hidden"
            />
          </label>

          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value.slice(0, 2000)); // Message schema maxlength
              pingTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={m.placeholder}
            disabled={composerLocked}
            aria-describedby={composerLocked ? "send-gate-note" : undefined}
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-[#131c26] dark:disabled:bg-slate-900 dark:disabled:text-slate-600"
          />

          <button
            type="button"
            onClick={send}
            disabled={sending || composerLocked || !text.trim()}
            className="shrink-0 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:brightness-105 disabled:opacity-50"
          >
            {sending ? "…" : m.send}
          </button>
        </div>
      </div>

      {retractFor ? (
        <RetractDialog
          m={m}
          message={retractFor}
          onCancel={() => setRetractFor(null)}
          onConfirm={() => retract(retractFor)}
        />
      ) : null}

      {undo ? (
        <UndoToast
          m={m}
          kind={undo.kind}
          onUndo={doUndo}
          onDismiss={() => {
            clearTimeout(undoTimer.current);
            setUndo(null);
          }}
        />
      ) : null}

      {reportFor ? (
        <ReportDialog
          m={m}
          onCancel={() => setReportFor(null)}
          onSubmit={submitReport}
        />
      ) : null}
    </div>
  );
}

// Three true statements, in order of what the user most needs to know:
// it goes for the other person too, it can be undone briefly, and a copy is
// kept for moderation.
//
// That last line is not boilerplate. "Delete for everyone" implies the message
// has left the world; it has not, and someone deciding whether to retract
// something sensitive is entitled to know that before they act rather than
// after.
//
// A preview of the message is shown so there is no doubt which one is going —
// the × sits on a hover row and mis-clicks are easy.
function RetractDialog({ m, message, onCancel, onConfirm }) {
  const preview = message.text || (message.imageUrl ? m.imageMessage : "");

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={m.retractTitle}
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-300 bg-white p-5 shadow-lg dark:border-slate-800 dark:bg-[#131c26]">
        <p className="text-[15px] font-bold text-slate-900 dark:text-white">
          {m.retractTitle}
        </p>

        {preview ? (
          <p className="mt-3 max-h-24 overflow-hidden rounded-xl bg-slate-100 px-3 py-2 text-sm italic text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {preview}
          </p>
        ) : null}

        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {m.retractBothParties}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {m.retractUndoNote}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-500">
          {m.retractModerationNote}
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {m.reportCancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-500 px-3.5 py-2 text-sm font-semibold text-white transition hover:brightness-105"
          >
            {m.retractConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}

// The only affordance that will ever tell the user undo exists — nothing lists
// hidden or retracted messages. Fixed to the bottom so it does not shift the
// thread, and dismissible so it never sits in the way of the composer.
function UndoToast({ m, kind, onUndo, onDismiss }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-4 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-slate-800">
        <span>{kind === "retract" ? m.messageDeleted : m.messageHidden}</span>
        <button
          type="button"
          onClick={onUndo}
          className="font-bold text-emerald-400 transition hover:text-emerald-300"
        >
          {m.undo}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={m.dismiss}
          className="text-slate-400 transition hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function TypingDots({ visible, label }) {
  if (!visible) return null;

  return (
    <div className="mt-2 flex items-center gap-2 px-1" aria-live="polite">
      <span
        aria-hidden="true"
        className="inline-flex items-center gap-1 rounded-2xl bg-slate-100 px-3 py-2 dark:bg-slate-800"
      >
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 dark:bg-slate-400"
            style={{ animationDelay: `${delay}ms`, animationDuration: "900ms" }}
          />
        ))}
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {label}
      </span>
    </div>
  );
}

// Actions differ by side, and the difference is not cosmetic:
//
//   mine   → retract (gone for both, via the confirm dialog)
//   theirs → hide (my view only, immediate) + report
//
// Offering both on one bubble would invite someone to "delete" another
// person's message and believe it gone for them too.
//
// A REMOVED message only ever reaches its sender — the server does not send it
// to anyone else — and carries no text, so it renders as a tombstone with no
// actions at all.
function Bubble({ msg, mine, m, busy, onHide, onRetract, onReport }) {
  if (msg.removed) {
    return (
      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[75%] rounded-2xl border border-dashed border-slate-300 px-4 py-2.5 dark:border-slate-700">
          <p className="text-[13px] italic text-slate-400 dark:text-slate-500">
            {m.removedByModerator}
          </p>
        </div>
      </div>
    );
  }

  const actions = (
    <span className="flex shrink-0 items-center">
      {!mine ? (
        <IconButton
          label={m.reportMessage}
          glyph="⚑"
          onClick={() => onReport(msg.id)}
        />
      ) : null}
      <IconButton
        label={mine ? m.retract : m.hideForMe}
        glyph={busy ? "…" : "×"}
        busy={busy}
        onClick={() => (mine ? onRetract(msg) : onHide(msg))}
      />
    </span>
  );

  return (
    <div
      className={`group flex items-center gap-1 ${mine ? "justify-end" : "justify-start"}`}
    >
      {mine ? actions : null}

      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          mine
            ? "bg-emerald-500 text-emerald-950"
            : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
        }`}
      >
        {msg.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={msg.imageUrl}
            alt=""
            className="max-h-72 rounded-xl object-cover"
          />
        ) : (
          <p className="whitespace-pre-wrap text-[15px]">{msg.text}</p>
        )}
        <p
          className={`mt-1 text-[11px] ${mine ? "text-emerald-900/60" : "text-slate-400 dark:text-slate-500"}`}
        >
          {new Date(msg.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {!mine ? actions : null}
    </div>
  );
}

// Faint but present on touch, revealed on hover on pointer devices. Hidden
// until hover would make it undiscoverable on a phone, where most of these
// conversations happen — the same mistake the photo-gate tooltip made.
function IconButton({ label, glyph, busy, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      title={label}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm text-slate-400 opacity-50 transition hover:bg-slate-100 hover:text-slate-600 focus:opacity-100 disabled:opacity-30 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-slate-800 dark:hover:text-slate-300"
    >
      {glyph}
    </button>
  );
}

// A reason is REQUIRED — the server rejects anything outside REPORT_REASONS,
// and an unlabelled report is close to useless to a moderator. The note is
// optional and capped server-side at 500.
//
// No <form>: submission is an explicit button, so a stray Enter in the
// textarea cannot file a report by accident.
function ReportDialog({ m, onCancel, onSubmit }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!reason || busy) return;
    setBusy(true);
    await onSubmit({ reason, note });
    setBusy(false);
  }

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={m.reportTitle}
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-300 bg-white p-5 shadow-lg dark:border-slate-800 dark:bg-[#131c26]">
        <p className="text-[15px] font-bold text-slate-900 dark:text-white">
          {m.reportTitle}
        </p>

        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {m.reportReason}
        </p>

        <div className="mt-2 space-y-1">
          {REPORT_REASONS.map((r) => (
            <label
              key={r.value}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <input
                type="radio"
                name="report-reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="accent-emerald-500"
              />
              {m[r.key] || r.value}
            </label>
          ))}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 500))}
          placeholder={m.reportNotePlaceholder}
          rows={3}
          className="mt-3 w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#0b1016]"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {m.reportCancel}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!reason || busy}
            className="rounded-lg bg-red-500 px-3.5 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
          >
            {busy ? "…" : m.reportSubmit}
          </button>
        </div>
      </div>
    </div>
  );
}
