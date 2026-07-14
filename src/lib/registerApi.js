// qup-pulse-admin/src/lib/registerApi.js
'use client';

// API calls for the 4-step web sign-up, wired to the LocalPulse backend.
//
// Contract (from the controllers):
//   register       POST  /auth/register   { username, email, pin, language } -> 201 { token, user }
//   updateProfile  PATCH /profile         { dob, gender, bio, photos:[{url,publicId}] } (Bearer)
//   geocode        GET   /location/geocode?q=...  -> { results:[{ name, fullName, lat, lng }] }
//   setLocation    POST  /location        { lat, lng, name, mode:'manual' } (Bearer)
//
// If any of these mount paths differ in your routes file, change ROUTES below —
// it's the single source of truth for the URLs.

import { setToken, setRole } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// >>> Route paths, matching the app's own API client (src/api/client.js). <<<
export const ROUTES = {
  register: '/auth/register',   // POST  { username, email, pin, language }
  profile: '/me',              // PATCH { dob, gender, bio, photos } — updateMyProfile
  geocode: '/geocode',         // GET   ?q=...
  location: '/location',       // POST  { lat, lng, name, mode }
  upload: '/upload',           // POST  multipart, field name 'image'
};

function url(path) {
  return `${API_URL}${path}`;
}

async function parse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// --- Step 1: create the account ---
// Returns { token, user }. Also stores the token + role so subsequent PATCHes
// authenticate, and so finishing drops the user into /home logged in.
export async function registerAccount({ username, email, pin, language }) {
  const res = await fetch(url(ROUTES.register), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, pin, language }),
  });
  const data = await parse(res);
  if (data.token) {
    setToken(data.token);
    setRole(data.user?.role || 'user');
  }
  return data;
}

function authHeaders() {
  // token was stored by registerAccount; read it back the same way api.js does
  const token = typeof window !== 'undefined'
    ? window.localStorage.getItem('qup_pulse_admin_jwt')
    : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// --- Steps 2 & 4: patch profile fields ---
// Server enforces the 18+ gate on dob and validates gender. photos is an array
// of { url, publicId }.
export async function patchProfile(fields) {
  const res = await fetch(url(ROUTES.profile), {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(fields),
  });
  return parse(res); // { profile }
}

// --- Step 3: city search (server-side Photon) ---
// Returns [] on a genuine no-match. Throws on transport/auth/server errors so
// the UI can tell "no results" apart from "the call failed".
export async function geocode(q) {
  let res;
  try {
    res = await fetch(`${url(ROUTES.geocode)}?q=${encodeURIComponent(q)}`, {
      headers: authHeaders(),
      cache: 'no-store',
    });
  } catch (e) {
    throw new Error(`Could not reach the search service: ${e.message}`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // 401/403 = auth; 400 = Photon unavailable; anything else = server error.
    throw new Error(data.error || `Search failed (${res.status})`);
  }
  return data.results || [];
}

// --- Step 3: save chosen location (manual pick from search or current position) ---
// setLocation wants lat/lng as NUMBERS and mode 'manual' for a hand-picked place.
export async function setLocation({ lat, lng, name, mode = 'manual' }) {
  const res = await fetch(url(ROUTES.location), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ lat, lng, name, mode }),
  });
  return parse(res);
}

// --- Step 4: image upload ---
// Uploads to your own API's /upload route (multipart, field name 'image' — must
// match the route's multer .single('image')). The route pushes to Cloudinary
// server-side and returns the uploaded image. We normalise to { url, publicId }
// for updateProfile's photos array.
//
// NOTE: adjust the response field names below if your /upload route returns
// different keys. Common shapes: { url, publicId } or { secure_url, public_id }.
export async function uploadImage(file) {
  const token = typeof window !== 'undefined'
    ? window.localStorage.getItem('qup_pulse_admin_jwt')
    : null;

  const form = new FormData();
  form.append('image', file); // field name MUST be 'image'

  const res = await fetch(url(ROUTES.upload), {
    method: 'POST',
    // No Content-Type header — the browser sets the multipart boundary itself.
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await parse(res);

  // Accept either the { url, publicId } shape or Cloudinary's raw shape.
  const imageUrl = data.url || data.secure_url;
  const publicId = data.publicId || data.public_id || null;
  if (!imageUrl) {
    throw new Error('Upload succeeded but no image URL was returned. Check the /upload response shape.');
  }
  return { url: imageUrl, publicId };
}