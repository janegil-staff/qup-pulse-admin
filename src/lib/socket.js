// qup-pulse-admin/src/lib/socket.js
'use client';

// ...existing header comment unchanged...

import { io } from 'socket.io-client';

let socket = null;
// The token the live socket authenticated with. authSocket() reads
// handshake.auth.token ONCE, at connect — so a cached socket keeps whoever was
// logged in when it was created, while REST reads localStorage per call. After
// a logout/login in the same tab that split the app in two: getMessages 200'd
// for the new user while chat:join rejected them as a non-participant. Compare
// on every get and rebuild when it changes.
let socketToken = null;

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

// Presence heartbeat. The server marks a user online only if lastSeenAt is
// within 2 minutes (ONLINE_MS in models/User.js), and touchLastSeen fires on
// connect and on this ping — nothing else. Without an interval the user goes
// dark after two minutes with the tab wide open.
let heartbeat = null;

export function getSocket() {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;

  // Token gone (logged out) — tear down rather than leave a live socket
  // authenticated as the previous user.
  if (!token) {
    if (socket) closeSocket();
    return null;
  }

  // Token changed (different user, or refreshed) — the existing socket is
  // authenticated as the old one and cannot be re-authenticated in place.
  if (socket && socketToken !== token) {
    closeSocket();
  }

  if (socket) return socket;

  socket = io(socketOrigin(), { auth: { token }, autoConnect: true });
  socketToken = token;

  socket.on('connect', () => {
    clearInterval(heartbeat);
    heartbeat = setInterval(() => socket?.emit('presence:ping'), 60_000);
  });
  socket.on('disconnect', () => clearInterval(heartbeat));
  socket.on('connect_error', (e) => console.error('[socket] connect_error', e.message));

  return socket;
}

export function closeSocket() {
  clearInterval(heartbeat);
  socket?.disconnect();
  socket = null;
  socketToken = null;
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