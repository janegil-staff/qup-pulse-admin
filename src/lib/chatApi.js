// qup-pulse-admin/src/lib/chatApi.js
"use client";

// Chat calls, mirroring server/src/routes/chat.routes.js:
//   listConversations   GET  /chat/conversations
//   listRequests        GET  /chat/requests
//   openConversation    POST /chat/conversations/:userId
//   acceptConversation  POST /chat/conversations/:id/accept
//   getMessages         GET  /chat/conversations/:id/messages?before=
//   sendMessage         POST /chat/conversations/:id/messages
//   hideMessage         POST /chat/messages/:id/hide
//   unhideMessage       POST /chat/messages/:id/unhide
//   retractMessage      POST /chat/messages/:id/retract
//   unretractMessage    POST /chat/messages/:id/unretract
//   reportMessage       POST /chat/messages/:id/report
//   chatUnreadCount     GET  /chat/unread-count
//   markRead            POST /chat/conversations/:id/read
//
// Sending goes over REST — the server persists AND broadcasts chat:message to
// both sides. It used to be a Socket.IO emit (chat:send), but that ack path
// was removed server-side and awaiting an ack that never fired left the send
// button stuck on "…". REST is the single source of truth.
//
// getMessages returns the WHOLE envelope. It used to end `return
// data.messages || []`, which discarded otherUser — and an OUTGOING PENDING
// thread appears in neither listConversations() (accepted only) nor
// listRequests() (incoming only), so the thread page had no other source for
// the participant and rendered "Unknown user".
//
// `conversation` carries status, initiator, canSend and sendBlockedReason.
// Those four are AUTHORITATIVE — the thread page used to derive all of them
// and got the empty-thread case wrong three different ways.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
const TOKEN_KEY = "qup_pulse_admin_jwt";

async function parse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status; // call sites branch on 403/409 without string-matching
    throw err;
  }
  return data;
}

export async function listConversations() {
  const res = await fetch(`${API_URL}/chat/conversations`, {
    headers: headers(),
    cache: "no-store",
  });
  const data = await parse(res);
  return data.conversations || [];
}

export async function listRequests() {
  const res = await fetch(`${API_URL}/chat/requests`, {
    headers: headers(),
    cache: "no-store",
  });
  const data = await parse(res);
  return data.requests || [];
}

export async function acceptConversation(id) {
  const res = await fetch(
    `${API_URL}/chat/conversations/${encodeURIComponent(id)}/accept`,
    { method: "POST", headers: headers() },
  );
  return parse(res);
}

// Returns { messages, otherUser, user, conversation }.
//
// otherUser is already through toPublic(), which is why the avatar resolves
// from photos[0].url rather than a stored avatarUrl field.
//
// conversation: { id, status, initiator, canSend, sendBlockedReason }.
// canSend is the server's own answer to "may this user send right now",
// computed with the same count checkPendingRules uses — so the composer locks
// BEFORE a doomed request rather than after a 403.
export async function getMessages(id, { before } = {}) {
  const qs = before ? `?before=${encodeURIComponent(before)}` : "";
  const res = await fetch(
    `${API_URL}/chat/conversations/${encodeURIComponent(id)}/messages${qs}`,
    { headers: headers(), cache: "no-store" },
  );
  const data = await parse(res);

  return {
    messages: data.messages || [],
    otherUser: data.otherUser || null,
    user: data.user || null,
    conversation: data.conversation || null,
  };
}

// Pass { text } or { imageUrl }. A 403 is the one-opener gate, not a generic
// failure, and its body is a TRANSLATION KEY (chatPendingLimit).
export async function sendMessage(id, body) {
  const res = await fetch(
    `${API_URL}/chat/conversations/${encodeURIComponent(id)}/messages`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
  return parse(res);
}

// ── The two ways a message disappears, and their undos ────────────────
//
// Use hide on the OTHER party's messages and retract on your own. The two are
// not interchangeable and the UI should not offer both on the same bubble.

// HIDE — my view only. The other participant keeps their copy, which is what
// keeps the message reportable by them and intact for moderation.
export async function hideMessage(messageId) {
  const res = await fetch(
    `${API_URL}/chat/messages/${encodeURIComponent(messageId)}/hide`,
    { method: "POST", headers: headers() },
  );
  return parse(res);
}

// UNHIDE — no time limit. Hiding never affected the other person, so putting
// it back cannot surprise anyone.
export async function unhideMessage(messageId) {
  const res = await fetch(
    `${API_URL}/chat/messages/${encodeURIComponent(messageId)}/unhide`,
    { method: "POST", headers: headers() },
  );
  return parse(res);
}

// RETRACT — my own message, gone for BOTH parties, no tombstone, no time
// limit. The document is never deleted, so admins retain the record.
//
// Returns 409 with `chatRetractReported` if the message has already been
// reported: an open complaint must not have its subject erased underneath it.
export async function retractMessage(messageId) {
  const res = await fetch(
    `${API_URL}/chat/messages/${encodeURIComponent(messageId)}/retract`,
    { method: "POST", headers: headers() },
  );
  return parse(res);
}

// UNRETRACT — 30 SECONDS ONLY, then 409 with `chatUndoWindowClosed`. The
// message goes back into the other person's thread at its original timestamp;
// beyond half a minute it would reappear buried mid-conversation, unnoticed or
// inexplicable. Drive this from the undo toast, not from a menu.
export async function unretractMessage(messageId) {
  const res = await fetch(
    `${API_URL}/chat/messages/${encodeURIComponent(messageId)}/unretract`,
    { method: "POST", headers: headers() },
  );
  return parse(res);
}

// Report to the moderation queue. `reason` must be one of REPORT_REASONS:
// spam, harassment, inappropriate, misinformation, other.
//
// Returns { ok, reportId, duplicate }. Filing twice is a NO-OP returning
// duplicate: true — a second press is a second press, not a failure, and the
// caller shows the same confirmation either way. Reporting your own message
// returns 400.
export async function reportMessage(messageId, { reason, note } = {}) {
  const res = await fetch(
    `${API_URL}/chat/messages/${encodeURIComponent(messageId)}/report`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ reason, note: note || "" }),
    },
  );
  return parse(res);
}

// The thread page follows this with a `chat:read` window event so AppNav's
// badge refetches without waiting for the next notify or navigation.
export async function markRead(id) {
  const res = await fetch(
    `${API_URL}/chat/conversations/${encodeURIComponent(id)}/read`,
    { method: "POST", headers: headers() },
  );
  return parse(res);
}

// COMBINED_UNREAD_CLIENT_V2 — the server returns `count` (unread in ACCEPTED
// threads) and `requestCount` (pending threads awaiting approval) SEPARATELY
// and deliberately: chatUnreadCount() scopes `count` to accepted precisely so
// the two cannot double-count. Adding them is the CLIENT's job.
//
// V1 of this comment claimed `count` was already combined. It never was, and
// AppNav rendered `count`, so the ✉ badge silently ignored every request.
export async function chatUnreadCount() {
  const res = await fetch(`${API_URL}/chat/unread-count`, {
    headers: headers(),
    cache: "no-store",
  });
  const data = await parse(res);
  const count = data.count || 0;
  const requestCount = data.requestCount || 0;
  return { count, requestCount, total: count + requestCount };
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
