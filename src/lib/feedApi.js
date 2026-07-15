// qup-pulse-admin/src/lib/feedApi.js
'use client';

// Feed calls, matching the server routes:
//   getFeed        GET  /posts/feed?lng&lat&radius&before&limit
//                    -> { posts: [ toClient() + savedByMe ] }
//   getFollowing   GET  /posts/following?before&limit
//                    -> { posts: [ toClient() ] }   NOTE: no savedByMe (server gap)
//   createPost     POST /posts   { text, type, lng, lat, placeName, imageUrl }
//                    -> { post }
//   toggleLike     POST /posts/:id/like        -> { likedByMe, likeCount }
//   toggleSave     POST /posts/:postId/save    -> { saved }
//   listComments   GET  /posts/:postId/comments   -> { comments: [{id,text,author,createdAt}] }
//   addComment     POST /posts/:postId/comments   { text } -> { comment }
//   deleteComment  DELETE /comments/:id           -> { ok }
//   uploadImage    POST /upload (multipart "image") -> { url, publicId }
//   reportPost     POST /posts/:postId/report  { reason, note } -> { ok }
//   blockUser      POST /users/:userId/block   -> { blocked: true }
//   unblockUser    DELETE /users/:userId/block -> { blocked: false }
//
// Post shape (Post.toClient): { id, type, text, imageUrl, placeName, location,
//   author: {id,username,displayName,photos,avatarUrl,online},
//   likeCount, likedByMe, createdAt }  (+ savedByMe on /posts/feed only)
//
// createPost takes imageUrl as a plain STRING, not {url, publicId}.

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

export const POST_TYPES = ['update', 'event', 'recommendation', 'lostfound', 'marketplace', 'question'];

// MODERATION_REASONS_V1 — must match REPORT_REASONS in server/src/models/Report.js.
// The server 400s on anything outside this list, so these keys are a contract,
// not a display concern. Labels are localized separately (t.app.feed.reasons.*).
export const REPORT_REASONS = ['spam', 'harassment', 'inappropriate', 'misinformation', 'other'];

export async function getFeed({ lng, lat, radius, before, limit = 20 } = {}) {
  const qs = new URLSearchParams();
  if (lng != null && lat != null) { qs.set('lng', String(lng)); qs.set('lat', String(lat)); }
  if (radius != null) qs.set('radius', String(radius));
  if (before) qs.set('before', before);
  qs.set('limit', String(limit));
  const res = await fetch(`${API_URL}/posts/feed?${qs.toString()}`, {
    headers: headers(false), cache: 'no-store',
  });
  const data = await parse(res);
  return data.posts || [];
}

export async function getFollowingFeed({ before, limit = 20 } = {}) {
  const qs = new URLSearchParams();
  if (before) qs.set('before', before);
  qs.set('limit', String(limit));
  const res = await fetch(`${API_URL}/posts/following?${qs.toString()}`, {
    headers: headers(false), cache: 'no-store',
  });
  const data = await parse(res);
  return data.posts || [];
}

export async function createPost({ text, type = 'update', lng, lat, placeName, imageUrl }) {
  const res = await fetch(`${API_URL}/posts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      text, type,
      ...(lng != null && lat != null ? { lng, lat } : {}),
      ...(placeName ? { placeName } : {}),
      ...(imageUrl ? { imageUrl } : {}),
    }),
  });
  const data = await parse(res);
  return data.post;
}

export async function toggleLike(postId) {
  const res = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}/like`, {
    method: 'POST', headers: headers(false),
  });
  return parse(res); // { likedByMe, likeCount }
}

export async function toggleSave(postId) {
  const res = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}/save`, {
    method: 'POST', headers: headers(false),
  });
  return parse(res); // { saved }
}

export async function listComments(postId) {
  const res = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}/comments`, {
    headers: headers(false), cache: 'no-store',
  });
  const data = await parse(res);
  return data.comments || [];
}

export async function addComment(postId, text) {
  const res = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'POST', headers: headers(), body: JSON.stringify({ text }),
  });
  const data = await parse(res);
  return data.comment;
}

export async function deleteComment(commentId) {
  const res = await fetch(`${API_URL}/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE', headers: headers(false),
  });
  return parse(res);
}

// Multipart — no Content-Type header; the browser sets the boundary.
export async function uploadImage(file) {
  const t = token();
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: fd,
  });
  return parse(res); // { url, publicId }
}

// Saved posts — the viewer's bookmarks. Server scopes this to the caller, so
// there's no userId param. savedByMe is implicitly true for everything here.
export async function listSaved() {
  const res = await fetch(`${API_URL}/posts/saved`, { headers: headers(), cache: 'no-store' });
  const data = await parse(res);
  return data.posts || data.saved || [];
}

/* ---------- moderation ---------- */
// These hit the same deployed endpoints the mobile app uses. `note` is optional
// and capped at 500 chars server-side (Report.note maxlength).

export async function reportPost(postId, reason, note = '') {
  const res = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}/report`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ reason, ...(note ? { note } : {}) }),
  });
  return parse(res); // { ok: true }
}

export async function reportUser(userId, reason, note = '') {
  const res = await fetch(`${API_URL}/users/${encodeURIComponent(userId)}/report`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ reason, ...(note ? { note } : {}) }),
  });
  return parse(res); // { ok: true }
}

// Blocking is bidirectional in effect: /posts/feed excludes posts where the
// viewer is either blocker OR blocked, so the next load drops them regardless
// of who blocked whom. The caller still prunes locally for an instant response.
export async function blockUser(userId) {
  const res = await fetch(`${API_URL}/users/${encodeURIComponent(userId)}/block`, {
    method: 'POST', headers: headers(false),
  });
  return parse(res); // { blocked: true }
}

export async function unblockUser(userId) {
  const res = await fetch(`${API_URL}/users/${encodeURIComponent(userId)}/block`, {
    method: 'DELETE', headers: headers(false),
  });
  return parse(res); // { blocked: false }
}