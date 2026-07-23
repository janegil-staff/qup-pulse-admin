// qup-pulse-admin/src/lib/chatApi.js
'use client';

// Chat calls, mirroring server/src/routes/index.js:
//   listConversations   GET  /chat/conversations           -> { conversations: [shapeConvo + unread] }
//   listRequests        GET  /chat/requests                -> { requests: [shapeConvo] }
//   openConversation    POST /chat/conversations/:userId   -> { conversationId, status }
//   acceptConversation  POST /chat/conversations/:id/accept-> { ok, conversationId, status }
//   getMessages         GET  /chat/conversations/:id/messages?before= -> { messages: [toClient()] }
//   sendMessage         POST /chat/conversations/:id/messages -> { message: toClient() }
//   chatUnreadCount     GET  /chat/unread-count            -> { count, requestCount }
//   markRead            POST /chat/conversations/:id/read   -> { ok }
//
// Sending goes over REST (POST .../messages) — the server persists AND
// broadcasts chat:message to both sides over the socket. It used to be a
// Socket.IO emit (chat:send), but that ack path was unreliable and has been
// removed server-side; awaiting an ack that never fired left the send button
// stuck on "…". REST is the single source of truth.

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const TOKEN_KEY = 'qup_pulse_admin_jwt';

function headers() {
  const t = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

async function parse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status; // call sites can branch on 403/404 without string-matching
    throw err;
  }
  return data;
}

export async function listConversations() {
  const res = await fetch(`${API_URL}/chat/conversations`, { headers: headers(), cache: 'no-store' });
  const data = await parse(res);
  return data.conversations || [];
}

export async function listRequests() {
  const res = await fetch(`${API_URL}/chat/requests`, { headers: headers(), cache: 'no-store' });
  const data = await parse(res);
  return data.requests || [];
}

export async function acceptConversation(id) {
  const res = await fetch(`${API_URL}/chat/conversations/${encodeURIComponent(id)}/accept`, {
    method: 'POST', headers: headers(),
  });
  return parse(res);
}

export async function getMessages(id, { before } = {}) {
  const qs = before ? `?before=${encodeURIComponent(before)}` : '';
  const res = await fetch(`${API_URL}/chat/conversations/${encodeURIComponent(id)}/messages${qs}`, {
    headers: headers(), cache: 'no-store',
  });
  const data = await parse(res);
  return data.messages || [];
}

// Send a text or image message over REST. Pass { text } or { imageUrl }.
// Returns { message: toClient() }. The server also broadcasts chat:message to
// the conversation room (both participants), so the thread's socket listener
// renders the bubble; dedup by id handles the echo of our own message.
export async function sendMessage(id, body) {
  const res = await fetch(`${API_URL}/chat/conversations/${encodeURIComponent(id)}/messages`, {
    method: 'POST', headers: headers(), body: JSON.stringify(body), cache: 'no-store',
  });
  return parse(res);
}

// COMBINED_UNREAD_CLIENT_V1 — `count` is the combined total (inbox unreads +
// incoming requests) the badge shows; `requestCount` is the request share of
// it, available for a split badge without another round-trip. Returns an object
// now, not a number — callers must read `.count`.
export async function chatUnreadCount() {
  const res = await fetch(`${API_URL}/chat/unread-count`, { headers: headers(), cache: 'no-store' });
  const data = await parse(res);
  return { count: data.count || 0, requestCount: data.requestCount || 0 };
}

export async function markRead(id) {
  const res = await fetch(`${API_URL}/chat/conversations/${encodeURIComponent(id)}/read`, {
    method: 'POST', headers: headers(),
  });
  return parse(res);
}