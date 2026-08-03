// qup-pulse-admin/src/lib/adminChatApi.js
"use client";

// Moderation reads and actions on private conversations.
//
//   adminGetConversation      GET  /admin/conversations/:id/messages
//     -> { conversation: { id, status, initiator, participants[] },
//          messages: [toAdmin()] }
//
//   adminListHiddenMessages   GET  /admin/messages/hidden
//     -> { messages: [toAdmin() + sender, conversationId, hiddenByUsers] }
//
//   adminListRemovedMessages  GET  /admin/messages/removed
//     -> { messages: [+ removedAt, removedReason, removedBy, hiddenCount] }
//
//   adminRemoveMessage        POST /admin/messages/:id/remove   { reason }
//   adminRestoreMessage       POST /admin/messages/:id/restore
//
// Separate module from chatApi.js on purpose. chatApi is the PARTICIPANT
// surface and every read in it is filtered by hiddenFor; nothing here is
// filtered at all. Keeping them apart means a participant-facing call can
// never reach an unfiltered read by picking the wrong function name.
//
// messages come from Message.toAdmin(), not toClient(): original text
// regardless of who hid it, plus hiddenFor / hiddenCount. A message someone
// "deleted for me" is returned in full — hiding is a per-user array and never
// modifies the document, which is the whole reason moderation still works
// after it.
//
// HIDDEN vs REMOVED — two different things, and this module now touches both:
//
//   hidden   a PARTICIPANT put a message out of their own view. Per-user,
//            additive, invisible to the other side, and not a moderation
//            action at all. Usually ordinary housekeeping.
//   removed  a MODERATOR took a message down. Global, asymmetric (the sender
//            keeps a tombstone, the recipient's thread loses it entirely),
//            reversible, and attributed to whoever did it.
//
// A message can be both. Restoring a removed message does NOT un-hide it for
// a participant who had also hidden it, which is correct and surprising enough
// to be worth surfacing in the UI.
//
// requireAdmin is the only gate on every endpoint here; there is no
// participant check on any of them. adminGetConversation should be called
// FROM A REPORT.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
const TOKEN_KEY = "qup_pulse_admin_jwt";

// These MUST match admin.routes.js. They are constants rather than inline
// template strings so that a mismatch is one edit in one place instead of a
// hunt through four call sites — the remove/restore paths in particular were
// written against a routes file I could not see when these functions landed.
const PATH_HIDDEN = "/admin/messages/hidden";
const PATH_REMOVED = "/admin/messages/removed";
function pathRemove(id) {
  return `/admin/messages/${encodeURIComponent(id)}/remove`;
}
function pathRestore(id) {
  return `/admin/messages/${encodeURIComponent(id)}/restore`;
}

async function parse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function headers() {
  const t =
    typeof window !== "undefined"
      ? window.localStorage.getItem(TOKEN_KEY)
      : null;
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

export async function adminGetConversation(id, { limit } = {}) {
  const qs = limit ? `?limit=${encodeURIComponent(limit)}` : "";
  const res = await fetch(
    `${API_URL}/admin/conversations/${encodeURIComponent(id)}/messages${qs}`,
    {
      headers: headers(),
      cache: "no-store",
    },
  );
  const data = await parse(res);

  return {
    conversation: data.conversation || null,
    messages: data.messages || [],
  };
}

// Every message with a non-empty hiddenFor, newest first. Capped server-side.
export async function adminListHiddenMessages({ limit } = {}) {
  const qs = limit ? `?limit=${encodeURIComponent(limit)}` : "";
  const res = await fetch(`${API_URL}${PATH_HIDDEN}${qs}`, {
    headers: headers(),
    cache: "no-store",
  });
  const data = await parse(res);

  return { messages: data.messages || [] };
}

// Every message a moderator has removed, most recently removed first.
//
// This list is what makes removal reversible in practice. Without it a removed
// message is only reachable if a participant also hid it or a report happens
// to point at its conversation — so a moderator could not undo their own
// action, and a reversible tool would be permanent by accident.
export async function adminListRemovedMessages({ limit } = {}) {
  const qs = limit ? `?limit=${encodeURIComponent(limit)}` : "";
  const res = await fetch(`${API_URL}${PATH_REMOVED}${qs}`, {
    headers: headers(),
    cache: "no-store",
  });
  const data = await parse(res);

  return { messages: data.messages || [] };
}

// Take a message down.
//
// Idempotent server-side: removing something already removed returns
// { ok: true, alreadyRemoved: true } rather than an error, so a double click
// or two moderators on the same queue row cannot produce a failure — and the
// first one's name and timestamp survive in the audit trail.
//
// `reason` is free text, truncated to 500 chars server-side. It is shown back
// to moderators on the removed list, not to either participant.
export async function adminRemoveMessage(id, { reason } = {}) {
  const res = await fetch(`${API_URL}${pathRemove(id)}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ reason: reason || "" }),
  });
  const data = await parse(res);

  return {
    ok: Boolean(data.ok),
    messageId: data.messageId || String(id),
    alreadyRemoved: Boolean(data.alreadyRemoved),
  };
}

// Put a message back.
//
// Note what this does NOT restore: the removedByAdmin record is unset, so who
// removed it and why are gone afterwards. That is a deliberate consequence of
// the absence of removedByAdmin.at being the single presence test every query
// relies on, and it means the removed list is the only place that history
// exists — read the reason before you restore, not after.
export async function adminRestoreMessage(id) {
  const res = await fetch(`${API_URL}${pathRestore(id)}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({}),
  });
  const data = await parse(res);

  return {
    ok: Boolean(data.ok),
    messageId: data.messageId || String(id),
    alreadyRestored: Boolean(data.alreadyRestored),
  };
}
