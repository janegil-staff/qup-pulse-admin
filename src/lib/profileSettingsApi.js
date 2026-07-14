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