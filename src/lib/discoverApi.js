// qup-pulse-admin/src/lib/discoverApi.js
'use client';

// Discovery calls for the web, matching the app's API (src/api/client.js):
//   getDiscovery     GET  /discovery              -> { users|people|deck|[], browsingFrom, browsingElsewhere }
//   updateLocation   PATCH /me/location           { lng, lat }   (background GPS push)
//   setBrowseLocation POST /browse-location        { clear: true } (browse near me again)
//
// Auth: Bearer token from localStorage (same key api.js uses).

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const TOKEN_KEY = 'qup_pulse_admin_jwt';

function token() {
    return typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
}

function headers(json = true) {
    const t = token();
    return {
        ...(json ? { 'Content-Type': 'application/json' } : {}),
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
    };
}

async function parse(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
}

// GET /discovery — returns the raw payload; the screen normalises the list.
export async function getDiscovery() {
    const res = await fetch(`${API_URL}/discovery`, {
        headers: headers(false),
        cache: 'no-store',
    });
    return parse(res);
}

// PATCH /me/location — background GPS push so results are geo-accurate.
// Fire-and-forget from the caller's perspective; never blocks the fetch.
export async function updateLocation(lng, lat) {
    const res = await fetch(`${API_URL}/me/location`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ lng, lat }),
    });
    return parse(res);
}

// POST /browse-location { clear: true } — reset back to the viewer's own area.
export async function clearBrowseLocation() {
    const res = await fetch(`${API_URL}/browse-location`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ clear: true }),
    });
    return parse(res);
}

// Normalise the flexible list shape the app tolerates.
export function extractPeople(data) {
    return data.users ?? data.people ?? data.deck ?? (Array.isArray(data) ? data : []);
}

// Fallback avatar for users with no photo. Lives in public/images/ and is
// therefore served from /images/ — the /public prefix is not part of the URL.
export const PLACEHOLDER_AVATAR = '/images/placeholder.png';

// Best-effort avatar URL from a person record (photos[] of {url} or avatarUrl).
// Always returns a usable src: falls back to the placeholder rather than null,
// so callers can render <img> unconditionally.
export function avatarUrl(person) {
    if (person.avatarUrl) return person.avatarUrl;
    const first = Array.isArray(person.photos) ? person.photos[0] : null;
    if (typeof first === 'string' && first) return first;
    if (first?.url) return first.url;
    return PLACEHOLDER_AVATAR;
}