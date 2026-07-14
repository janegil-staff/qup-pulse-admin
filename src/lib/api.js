// qup-pulse-admin/src/lib/api.js
'use client';

// Thin client over the Qup Pulse admin API. Every admin route is gated by
// requireAuth + requireAdmin on the backend, so we send the JWT as a Bearer
// token on every request.
//
// URL strategy: with the Next.js rewrite proxy (next.config.mjs), the dashboard
// calls its OWN origin under /api, and Next forwards to the real API
// server-side. So we build same-origin paths from a single base — no CORS.
// Set NEXT_PUBLIC_API_URL=/api (the default) to route through the proxy.
// The client URL must never contain the DigitalOcean host, or requests go
// cross-origin again and CORS returns.

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const TOKEN_KEY = 'qup_pulse_admin_jwt';

// Thrown on 401 (missing/expired token) and 403 (not an admin). Pages catch
// this with `instanceof AuthError` and redirect to /login themselves, rather
// than the client doing a hard window.location redirect. This keeps navigation
// in the component/router layer where it belongs.
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
// The app's login endpoint expects { emailOrUsername, password } and returns
// { token, user }. The PIN is sent as the `password` field. These field names
// come straight from the API's login validator.
export async function login(email, pin) {
  const res = await fetch(url('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrUsername: email, password: pin }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data; // { token, user }
}

// --- Admin endpoints (match adminController routes) ---
export const adminApi = {
  // Exposed here so call sites can use adminApi.login(...) consistently with
  // the other adminApi.* calls. The standalone `login` export also works.
  login,

  stats: () => request('/admin/stats'),

  listUsers: () => request('/admin/users'),
  // Named banUser to match the reports/users pages. setBanned alias kept below.
  banUser: (id, banned) =>
    request(`/admin/users/${id}/ban`, { method: 'PATCH', body: { banned } }),

  listPosts: () => request('/admin/posts'),
  deletePost: (id) => request(`/admin/posts/${id}`, { method: 'DELETE' }),

  // Optional status filter ('open' | 'reviewed' | 'dismissed' | ''). Empty
  // returns all. Sent as a query param the backend can ignore if unsupported.
  listReports: (status = '') =>
    request(`/admin/reports${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  resolveReport: (id, status) =>
    request(`/admin/reports/${id}`, { method: 'PATCH', body: { status } }),
};

// Backwards-compatible alias: earlier pages imported setBanned.
adminApi.setBanned = adminApi.banUser;