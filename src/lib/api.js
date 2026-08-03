// qup-pulse-admin/src/lib/api.js
"use client";

// Thin client over the Qup Pulse API. Sends the JWT as a Bearer token.
// With the Next.js rewrite proxy (next.config.mjs), the dashboard calls its own
// origin under /api and Next forwards server-side — no CORS.

import { closeSocket } from "./socket";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

const TOKEN_KEY = "qup_pulse_admin_jwt";
const ROLE_KEY = "qup_pulse_role";
const USERNAME_KEY = "qup_pulse_username";

export class AuthError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (typeof window === "undefined") return;
  if (token === null || token === undefined) {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ROLE_KEY);
  window.localStorage.removeItem(USERNAME_KEY);
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
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ROLE_KEY);
}

export function setRole(role) {
  if (typeof window === "undefined") return;
  if (!role) {
    window.localStorage.removeItem(ROLE_KEY);
    return;
  }
  window.localStorage.setItem(ROLE_KEY, role);
}

export function isAdmin() {
  return getRole() === "admin";
}

export function isModerator() {
  return getRole() === "moderator";
}

// Anyone with a staff role. The panel's nav uses this to decide what to show;
// the server decides what they can actually do (requireModerator/requireAdmin).
export function isStaff() {
  return isAdmin() || isModerator();
}

// Stored at login purely to label the nav — same category as the role: a UI
// convenience, never read for authorization. Saves a /me round-trip on every
// page load, since login() already returns the user.
//
// Accounts logged in before this shipped have no stored name, so the label is
// blank until their next login. Deliberate: a /me fallback would cost a request
// on every mount to cover a one-time gap.
export function getUsername() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USERNAME_KEY);
}

export function setUsername(name) {
  if (typeof window === "undefined") return;
  if (!name) {
    window.localStorage.removeItem(USERNAME_KEY);
    return;
  }
  window.localStorage.setItem(USERNAME_KEY, name);
}
// qup-pulse-admin/src/lib/api.js

// --- Seed / demo data (dev tooling) ---
// Separate from request() because these endpoints return a `log` array that is
// worth showing even when the run fails partway through — request() discards
// the body on error.
async function seedRequest(path, body = {}) {
  const token = getToken();
  const res = await fetch(url(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (res.status === 401) {
    throw new AuthError("Session expired. Please sign in again.", 401);
  }
  if (res.status === 403) {
    throw new AuthError("Admin access required, or seeding is disabled.", 403);
  }

  // A gateway timeout returns HTML, not JSON.
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `${res.status} ${res.statusText} — response was not JSON, usually a timeout.`,
    );
  }

  if (!res.ok || data.ok === false) {
    const error = new Error(data.error || `Request failed (${res.status})`);
    error.log = data.log || [];
    throw error;
  }
  return data;
}
// qup-pulse-admin/src/lib/api.js

// up/down return 202 { jobId } immediately — poll getJob for progress.
export const seedApi = {
  uploadAssets: () => seedRequest("/admin/seed/insert/assets"),
  seedData: (options) => seedRequest("/admin/seed/insert/data", options),
  seedComments: () => seedRequest("/admin/seed/insert/comments"),
  removeAssets: (confirm) =>
    seedRequest("/admin/seed/remove/assets", { confirm }),
  removeComments: (confirm) =>
    seedRequest("/admin/seed/remove/comments", { confirm }),
  removeData: (confirm) => seedRequest("/admin/seed/remove/data", { confirm }),

  up: (options) => seedRequest("/admin/seed/up", options),
  down: (confirm) => seedRequest("/admin/seed/down", { confirm }),

  getJob: (id, since = 0) => request(`/admin/seed/jobs/${id}?since=${since}`),
  listJobs: () => request("/admin/seed/jobs"),
  cancelJob: (id) => seedRequest(`/admin/seed/jobs/${id}/cancel`),
};
function url(path) {
  return `${API_URL}${path}`;
}

async function request(path, { method = "GET", body } = {}) {
  const token = getToken();
  const res = await fetch(url(path), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    throw new AuthError("Session expired. Please sign in again.", 401);
  }

  // A 403 carrying a `code` is a rule the endpoint enforces (e.g. you cannot
  // change your own role), NOT a failed admin check. Only the codeless kind
  // means "this account is not an admin" and should bounce to login.
  if (res.status === 403 && !data.code) {
    throw new AuthError(
      "Admin access required — this account is not an admin.",
      403,
    );
  }

  if (!res.ok) {
    const error = new Error(data.error || `Request failed (${res.status})`);
    error.status = res.status;
    error.code = data.code;
    throw error;
  }
  return data;
}

// --- Auth ---
// /auth/login expects { emailOrUsername, password } and returns { token, user }.
// The PIN is sent as `password`. `user.role` is included (see User.toPublic()).
export async function login(email, pin) {
  const res = await fetch(url("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emailOrUsername: email, password: pin }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data; // { token, user: { ..., role } }
}

// --- Admin endpoints (match adminController routes) ---
export const adminApi = {
  login,
  stats: () => request("/admin/stats"),
  me: () => request("/me"),
  listUsers: (q = "") =>
    request(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  banUser: (id, banned) =>
    request(`/admin/users/${id}/ban`, { method: "PATCH", body: { banned } }),
  setRole: (id, role) =>
    request(`/admin/users/${id}/role`, { method: "PATCH", body: { role } }),
  roleHistory: (id) => request(`/admin/users/${id}/role-history`),
  listRoleChanges: () => request("/admin/role-changes"),
  listPosts: () => request("/admin/posts"),
  deletePost: (id) => request(`/admin/posts/${id}`, { method: "DELETE" }),
  listReports: (status = "") =>
    request(
      `/admin/reports${status ? `?status=${encodeURIComponent(status)}` : ""}`,
    ),
  resolveReport: (id, status) =>
    request(`/admin/reports/${id}`, { method: "PATCH", body: { status } }),
};
adminApi.setBanned = adminApi.banUser;
