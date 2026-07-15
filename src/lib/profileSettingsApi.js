// qup-pulse-admin/src/lib/profileSettingsApi.js
'use client';

// Profile + preference calls for the web Personal Settings page, matching the
// app's client (src/api/client.js):
//   getMyProfile      GET   /me                     -> { profile }
//   updateMyProfile   PATCH /me                     { username|gender|email|pin|bio|displayName|... }
//   updatePreferences PATCH /me/preferences         { show|ageMin|ageMax|maxDistanceKm }
//   changePin         POST  /auth/change-pin        { currentPin, newPin }

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const TOKEN_KEY = 'qup_pulse_admin_jwt';

function headers() {
  const t = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

async function parse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function getMyProfile() {
  const res = await fetch(`${API_URL}/me`, { headers: headers(), cache: 'no-store' });
  const data = await parse(res);
  return data.profile ?? data; // tolerate { profile } or bare
}

export async function updateMyProfile(fields) {
  const res = await fetch(`${API_URL}/me`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify(fields),
  });
  const data = await parse(res);
  return data.profile ?? data;
}

export async function updatePreferences(fields) {
  const res = await fetch(`${API_URL}/me/preferences`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify(fields),
  });
  const data = await parse(res);
  return data.preferences ?? data;
}

export async function changePin(currentPin, newPin) {
  const res = await fetch(`${API_URL}/auth/change-pin`, {
    method: 'POST', headers: headers(), body: JSON.stringify({ currentPin, newPin }),
  });
  return parse(res);
}

// City search — server-side Photon. Returns [] on no match; throws on error.
export async function geocode(q) {
  const res = await fetch(`${API_URL}/geocode?q=${encodeURIComponent(q)}`, {
    headers: headers(), cache: 'no-store',
  });
  const data = await parse(res);
  return data.results || [];
}

// Save chosen location. mode 'manual' for a hand-picked place (with a name),
// 'gps' for a current-position fix (server reverse-geocodes the name).
// setLocation wants lat/lng as NUMBERS.
export async function setLocation({ lat, lng, name, mode = 'manual' }) {
  const res = await fetch(`${API_URL}/location`, {
    method: 'POST', headers: headers(), body: JSON.stringify({ lat, lng, name, mode }),
  });
  return parse(res);
}

// Additions for qup-pulse-admin/src/lib/profileSettingsApi.js
// Append these to the existing file (they reuse headers() and parse()).

// Blocked users — GET /blocks -> { blocked: [publicUser] }
export async function getBlockedUsers() {
  const res = await fetch(`${API_URL}/blocks`, { headers: headers(), cache: 'no-store' });
  const data = await parse(res);
  return data.blocked || [];
}

// Unblock — DELETE /users/:userId/block -> { blocked: false }
export async function unblockUser(userId) {
  const res = await fetch(`${API_URL}/users/${encodeURIComponent(userId)}/block`, {
    method: 'DELETE', headers: headers(),
  });
  return parse(res);
}

// Additions for qup-pulse-admin/src/lib/profileSettingsApi.js
// Append to the existing file — reuses API_URL, headers(), parse().

// Public profile — GET /users/:username (optionalAuth: JWT gives followedByMe)
// -> { profile: {id, username, displayName, photos, avatarUrl, online,
//               followerCount, followingCount, followedByMe}, posts: [...] }
export async function getPublicProfile(username) {
  const res = await fetch(`${API_URL}/users/${encodeURIComponent(username)}`, {
    headers: headers(), cache: 'no-store',
  });
  return parse(res); // { profile, posts }
}

// Follow / unfollow — POST|DELETE /users/:id/follow -> { following: bool }
export async function followUser(userId) {
  const res = await fetch(`${API_URL}/users/${encodeURIComponent(userId)}/follow`, {
    method: 'POST', headers: headers(),
  });
  return parse(res);
}

export async function unfollowUser(userId) {
  const res = await fetch(`${API_URL}/users/${encodeURIComponent(userId)}/follow`, {
    method: 'DELETE', headers: headers(),
  });
  return parse(res);
}

// Image upload — POST /upload (multipart, field name "image")
// NOTE: no Content-Type header — the browser sets the multipart boundary.
export async function uploadImage(file) {
  const t = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: fd,
  });
  return parse(res); // { url, publicId }
}


// Report a user — POST /users/:userId/report { reason, note } -> { ok: true }
// Takes an object to match the call site: reportUser(id, { reason, note }).
// `reason` MUST be one of REPORT_REASONS in server/src/models/Report.js
// ('spam','harassment','inappropriate','misinformation','other'); the server
// rejects anything else with a 400. Note is capped at 500 by the schema.
export async function reportUser(userId, { reason, note = '' } = {}) {
  const res = await fetch(`${API_URL}/users/${encodeURIComponent(userId)}/report`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ reason, note }),
  });
  return parse(res);
}

// Block — POST /users/:userId/block -> { blocked: true }
export async function blockUser(userId) {
  const res = await fetch(`${API_URL}/users/${encodeURIComponent(userId)}/block`, {
    method: 'POST', headers: headers(),
  });
  return parse(res);
}