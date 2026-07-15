// qup-pulse-admin/src/lib/socket.js
'use client';

// Socket.IO client for chat, matching server/src/socket/chat.js.
//
// Auth: JWT in the handshake `auth.token` — NOT a header or query param.
// The server's authSocket() reads socket.handshake.auth.token and rejects
// the connection outright without it.
//
// Origin: NEXT_PUBLIC_SOCKET_URL, an absolute URL. It cannot reuse
// NEXT_PUBLIC_API_URL=/api because next.config.mjs's rewrite is server-side
// and does not proxy WebSocket upgrades — the socket must hit the API directly.
//
// Transports: left at the default ['polling', 'websocket']. Forcing
// ['websocket'] skips the HTTP handshake and times out against DigitalOcean's
// proxy, even though the server advertises upgrades:["websocket"].
//
// Events out: chat:join {conversationId} (ack), chat:leave {conversationId},
//   chat:send {conversationId, text} (ack), chat:sendImage {conversationId,
//   imageUrl} (ack), chat:typing {conversationId}, presence:ping
// Events in: chat:message (Message.toClient()), chat:typing {userId},
//   chat:notify {conversationId, preview, status, pending}
//
// Acks resolve to { ok: true, message } or { error: '...' } — never both.

import { io } from 'socket.io-client';
let socket = null;
const TOKEN_KEY = 'qup_pulse_admin_jwt';

function socketOrigin() {
  const raw = process.env.NEXT_PUBLIC_SOCKET_URL || '';
  if (!raw) {
    console.error('[socket] NEXT_PUBLIC_SOCKET_URL is not set — chat cannot connect');
    return undefined;
  }
  try {
    return new URL(raw).origin;
  } catch {
    console.error('[socket] NEXT_PUBLIC_SOCKET_URL is not a valid URL:', raw);
    return undefined;
  }
}

export function getSocket() {
  // `socket.connecting` is not a real property on socket.io-client's Socket —
  // it reads undefined, so the old guard fell through and every call during
  // startup built a NEW Manager, orphaning handlers bound to the previous one.
  // chat:join could land on one instance while chat:message listened on another.
  // A non-null socket is enough: the client queues emits while disconnected.
  if (socket) return socket;

  const token = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
  if (!token) return null;

  socket = io(socketOrigin(), {
    auth: { token },
    autoConnect: true,
  });

  socket.on('connect', () => console.log('[socket] connected', socket.id));
  socket.on('connect_error', (e) => console.error('[socket] connect_error', e.message));

  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
}

// Promise wrapper around an ack'd emit. Rejects on { error }, resolves on ok.
export function emitAck(event, payload) {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    if (!s) return reject(new Error('Not connected'));
    s.emit(event, payload, (res) => {
      if (!res || res.error) return reject(new Error(res?.error || 'Failed'));
      resolve(res);
    });
  });
}