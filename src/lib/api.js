// qup-pulse-admin/src/lib/api.js
'use client';

// Thin client over the Qup Pulse API. Sends the JWT as a Bearer token.
// With the Next.js rewrite proxy (next.config.mjs), the dashboard calls its own
// origin under /api and Next forwards server-side — no CORS.
import { closeSocket } from './socket';
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const TOKEN_KEY = 'qup_pulse_admin_jwt';
const ROLE_KEY = 'qup_pulse_role';

export class AuthError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (typeof window === 'undefined') return;
  if (token === null || token === undefined) {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ROLE_KEY);
  // Tear the socket down with the token. authSocket() reads the JWT once at
  // connect, so a surviving socket stays authenticated as the user who just
  // logged out — still in their convo: rooms, still receiving their messages.
  // getSocket() also rebuilds on token change, but that's a backstop; this is
  // the moment we actually know.
  closeSocket();
}

// Role is stored client-side purely to show/hide admin UI. It is NOT a security
// boundary — every /admin/* route re-checks role server-side via requireAdmin.
export function getRole() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ROLE_KEY);
}

export function setRole(role) {
  if (typeof window === 'undefined') return;
  if (!role) {
    window.localStorage.removeItem(ROLE_KEY);
    return;
  }
  window.localStorage.setItem(ROLE_KEY, role);
}

export function isAdmin() {
  return getRole() === 'admin';
}

function url(path) {
  return `${API_URL}${path}`;
}

async function request(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const res = await fetch(url(path), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });

  if (res.status === 401) {
    throw new AuthError('Session expired. Please sign in again.', 401);
  }
  if (res.status === 403) {
    throw new AuthError('Admin access required — this account is not an admin.', 403);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// --- Auth ---
// /auth/login expects { emailOrUsername, password } and returns { token, user }.
// The PIN is sent as `password`. `user.role` is included (see User.toPublic()).
export async function login(email, pin) {
  const res = await fetch(url('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrUsername: email, password: pin }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data; // { token, user: { ..., role } }
}

// --- Admin endpoints (match adminController routes) ---
export const adminApi = {
  
  login,

  stats: () => request('/admin/stats'),

  listUsers: () => request('/admin/users'),
  banUser: (id, banned) =>
    request(`/admin/users/${id}/ban`, { method: 'PATCH', body: { banned } }),

  listPosts: () => request('/admin/posts'),
  deletePost: (id) => request(`/admin/posts/${id}`, { method: 'DELETE' }),

  listReports: (status = '') =>
    request(`/admin/reports${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  resolveReport: (id, status) =>
    request(`/admin/reports/${id}`, { method: 'PATCH', body: { status } }),
};

adminApi.setBanned = adminApi.banUser;