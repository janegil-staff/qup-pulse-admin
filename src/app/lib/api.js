// localpulse-admin/lib/api.js
// Thin fetch wrapper for the LocalPulse admin API. Attaches the admin JWT from
// localStorage, and normalizes errors so callers get a thrown Error with the
// server's message. A 401/403 clears the token and signals the caller to bounce
// to /login — the API's requireAdmin is the source of truth for authorization,
// not any client-side role flag (user.toPublic() doesn't even include role).

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://lionfish-app-ed6lo.ondigitalocean.app/api';

const TOKEN_KEY = 'lp_admin_token';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function clearToken() {
  setToken(null);
}

// Thrown for 401/403 so pages can redirect to /login specifically.
export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error(`Can't reach the API. Check your connection. (${err.message})`);
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 || res.status === 403) {
    clearToken();
    throw new AuthError(data.error || 'Not authorized');
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const adminApi = {
  // Auth — same login the mobile app uses. Returns { token, user }.
  login: (email, pin) =>
    request('/auth/login', { method: 'POST', body: { email, pin }, auth: false }),

  // Reports. status is one of 'open' | 'reviewed' | 'dismissed', or omitted for all.
  listReports: (status) =>
    request(`/admin/reports${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  resolveReport: (id, status) =>
    request(`/admin/reports/${id}`, { method: 'PATCH', body: { status } }),

  // Moderation actions reachable from a report.
  banUser: (id, banned) =>
    request(`/admin/users/${id}/ban`, { method: 'PATCH', body: { banned } }),
  deletePost: (id) => request(`/admin/posts/${id}`, { method: 'DELETE' }),
};
