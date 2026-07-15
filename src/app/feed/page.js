// qup-pulse-admin/src/app/feed/page.js
'use client';

// Feed — Nearby (/posts/feed, geo-filtered) and Following (/posts/following).
// LOGGED-IN ONLY. Compose (text + type + image), like, save, comments.
// Localized via useLang() (t.app.feed.*).
//
// Server notes that shape this page:
//  - Post.toClient() has NO commentCount, and there's no count endpoint, so
//    comments load on demand when a post is expanded (avoids an N+1 on render).
//  - /posts/following does NOT return savedByMe (only /posts/feed does), so on
//    the Following tab the save flag starts false until the user toggles it.
//  - Pagination is cursor-style: pass `before` = oldest createdAt seen.
//  - createPost takes imageUrl as a STRING (not {url, publicId}).

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken } from '../../lib/api';
import { useLang } from '../../context/LandingLang';
import AppNav from '../../components/AppNav';
import {
  getFeed, getFollowingFeed, createPost, toggleLike, toggleSave,
  listComments, addComment, deleteComment, uploadImage, POST_TYPES,
} from '../../lib/feedApi';

const PAGE = 20;
const TEXT_MAX = 1000;
const COMMENT_MAX = 500;

export default function FeedPage() {
  const router = useRouter();
  const { t } = useLang();
  const f = t.app.feed;
  const s = t.app.settings;

  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('nearby'); // 'nearby' | 'following'
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [coords, setCoords] = useState(null);

  // Ask once; a denied prompt just means the nearby feed isn't geo-filtered,
  // which the server tolerates (it returns unlocated posts too).
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
      () => setCoords(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  const fetchPage = useCallback(async (which, before) => {
    if (which === 'following') return getFollowingFeed({ before, limit: PAGE });
    return getFeed({ ...(coords || {}), before, limit: PAGE });
  }, [coords]);

  const load = useCallback(async (which) => {
    setLoading(true);
    setError('');
    setDone(false);
    try {
      const list = await fetchPage(which);
      setPosts(list);
      if (list.length < PAGE) setDone(true);
    } catch (e) {
      setError(e.message || f.loadFailed);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [fetchPage, f]);

  useEffect(() => {
    if (!getToken()) { router.replace('/'); return; }
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (ready) load(tab);
  }, [ready, tab, load]);

  async function loadMore() {
    if (loadingMore || done || posts.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = posts[posts.length - 1]?.createdAt;
      const list = await fetchPage(tab, oldest);
      setPosts((prev) => [...prev, ...list]);
      if (list.length < PAGE) setDone(true);
    } catch (e) {
      setError(e.message || f.loadFailed);
    } finally {
      setLoadingMore(false);
    }
  }

  function onCreated(post) {
    // New post goes on top of whichever tab is showing.
    setPosts((prev) => [post, ...prev]);
  }

  function patchPost(id, patch) {
    setPosts((prev) => prev.map((p) => (String(p.id) === String(id) ? { ...p, ...patch } : p)));
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-500 dark:bg-[#0b1016] dark:text-slate-400">
        {s.loading}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-100">
      <AppNav />

      <main className="mx-auto max-w-2xl px-6 py-6">
        <Composer onCreated={onCreated} coords={coords} />

        {/* Tabs */}
        <div className="mb-4 flex gap-1">
          <TabButton active={tab === 'nearby'} onClick={() => setTab('nearby')}>{f.nearby}</TabButton>
          <TabButton active={tab === 'following'} onClick={() => setTab('following')}>{f.following}</TabButton>
        </div>

        {error ? (
          <p className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="grid place-items-center py-20 text-slate-500 dark:text-slate-400">{s.loading}</div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-[#131c26] dark:text-slate-400 dark:shadow-none">
            {tab === 'following' ? f.emptyFollowing : f.emptyNearby}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {posts.map((post) => (
                <PostCard key={String(post.id)} post={post} onPatch={patchPost} />
              ))}
            </div>
            {!done ? (
              <div className="mt-4 grid place-items-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {loadingMore ? s.loading : f.loadMore}
                </button>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-1.5 text-sm font-semibold transition ${
        active
          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
          : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- composer ---------- */

function Composer({ onCreated, coords }) {
  const { t } = useLang();
  const f = t.app.feed;
  const c = t.app.common;

  const [text, setText] = useState('');
  const [type, setType] = useState('update');
  const [placeName, setPlaceName] = useState('');
  const [image, setImage] = useState(null); // { url, publicId }
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr('');
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const up = await uploadImage(file);
      setImage(up);
    } catch (e2) {
      setErr(e2.message || f.uploadFailed);
      setImage(null);
      setPreview('');
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    const body = text.trim();
    if (!body) return setErr(f.textRequired);
    setErr('');
    setBusy(true);
    try {
      const post = await createPost({
        text: body.slice(0, TEXT_MAX),
        type,
        ...(coords || {}),
        placeName: placeName.trim(),
        imageUrl: image?.url || '',
      });
      onCreated(post);
      setText(''); setPlaceName(''); setImage(null); setPreview(''); setType('update');
    } catch (e) {
      setErr(e.message || f.postFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 rounded-2xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#131c26] dark:shadow-none">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, TEXT_MAX))}
        rows={3}
        placeholder={f.composePlaceholder}
        className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#0b1016]"
      />
      <p className="mt-1 text-right text-xs text-slate-400">{text.length}/{TEXT_MAX}</p>

      {preview ? (
        <div className="relative mt-2 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="max-h-40 rounded-xl object-cover" />
          <button
            type="button"
            onClick={() => { setImage(null); setPreview(''); }}
            aria-label={f.removeImage}
            className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-xs font-bold text-white"
          >
            ✕
          </button>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label={f.postType}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm dark:border-slate-700 dark:bg-[#0b1016]"
        >
          {POST_TYPES.map((k) => (
            <option key={k} value={k}>{f.types[k]}</option>
          ))}
        </select>

        <input
          value={placeName}
          onChange={(e) => setPlaceName(e.target.value)}
          placeholder={f.placeName}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#0b1016]"
        />

        <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {uploading ? f.uploading : f.addImage}
        </button>

        <button
          type="button"
          onClick={submit}
          disabled={busy || uploading || !text.trim()}
          className="rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-emerald-950 transition hover:brightness-105 disabled:opacity-50"
        >
          {busy ? c.saving : f.post}
        </button>
      </div>

      {err ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</p> : null}
    </div>
  );
}

/* ---------- post card ---------- */

function PostCard({ post, onPatch }) {
  const { t } = useLang();
  const f = t.app.feed;

  const [busyLike, setBusyLike] = useState(false);
  const [busySave, setBusySave] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const author = post.author || {};
  const avatar = author.avatarUrl || author.photos?.[0]?.url || '';
  const name = author.displayName || author.username || '—';

  async function onLike() {
    setBusyLike(true);
    try {
      const r = await toggleLike(post.id);
      onPatch(post.id, { likedByMe: r.likedByMe, likeCount: r.likeCount });
    } catch { /* leave state as-is */ }
    finally { setBusyLike(false); }
  }

  async function onSave() {
    setBusySave(true);
    try {
      const r = await toggleSave(post.id);
      onPatch(post.id, { savedByMe: r.saved });
    } catch { /* leave state as-is */ }
    finally { setBusySave(false); }
  }

  return (
    <article className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#131c26] dark:shadow-none">
      <div className="mb-3 flex items-center gap-3">
        {author.username ? (
          <Link href={`/profile/${encodeURIComponent(author.username)}`} className="shrink-0 no-underline">
            <Avatar src={avatar} name={name} />
          </Link>
        ) : (
          <Avatar src={avatar} name={name} />
        )}
        <div className="min-w-0 flex-1">
          {author.username ? (
            <Link
              href={`/profile/${encodeURIComponent(author.username)}`}
              className="block truncate text-sm font-semibold text-slate-900 no-underline hover:underline dark:text-slate-100"
            >
              {name}
            </Link>
          ) : (
            <span className="block truncate text-sm font-semibold">{name}</span>
          )}
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {f.types[post.type] || post.type}
            {post.placeName ? ` · ${post.placeName}` : ''}
            {post.createdAt ? ` · ${new Date(post.createdAt).toLocaleDateString()}` : ''}
          </p>
        </div>
      </div>

      <p className="whitespace-pre-wrap text-[15px] text-slate-800 dark:text-slate-200">{post.text}</p>

      {post.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.imageUrl} alt="" className="mt-3 max-h-96 w-full rounded-xl object-cover" />
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onLike}
          disabled={busyLike}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
            post.likedByMe
              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          ♥ {post.likeCount ?? 0}
        </button>

        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {showComments ? f.hideComments : f.comments}
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={busySave}
          className={`ml-auto rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
            post.savedByMe
              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          {post.savedByMe ? f.saved : f.save}
        </button>
      </div>

      {showComments ? <Comments postId={post.id} /> : null}
    </article>
  );
}

function Avatar({ src, name }) {
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-300 bg-slate-100 text-xs font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span>{(name || '?').slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}

/* ---------- comments (loaded on demand) ---------- */

function Comments({ postId }) {
  const { t } = useLang();
  const f = t.app.feed;
  const s = t.app.settings;

  const [list, setList] = useState(null); // null = not loaded yet
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    listComments(postId)
      .then((cs) => { if (!cancelled) setList(cs); })
      .catch((e) => { if (!cancelled) { setErr(e.message || f.commentsFailed); setList([]); } });
    return () => { cancelled = true; };
  }, [postId, f]);

  async function submit() {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setErr('');
    try {
      const c = await addComment(postId, body.slice(0, COMMENT_MAX));
      setList((prev) => [...(prev || []), c]);
      setText('');
    } catch (e) {
      setErr(e.message || f.commentFailed);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    try {
      await deleteComment(id);
      setList((prev) => (prev || []).filter((c) => String(c.id) !== String(id)));
    } catch (e) {
      setErr(e.message || f.deleteFailed);
    }
  }

  return (
    <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
      {list === null ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{s.loading}</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-600">{f.noComments}</p>
      ) : (
        <ul className="space-y-2">
          {list.map((c) => (
            <li key={String(c.id)} className="flex items-start gap-2.5">
              <Avatar src={c.author?.avatarUrl || c.author?.photos?.[0]?.url || ''} name={c.author?.displayName || c.author?.username} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {c.author?.displayName || c.author?.username || '—'}
                </p>
                <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{c.text}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(c.id)}
                aria-label={f.deleteComment}
                title={f.deleteComment}
                className="shrink-0 text-xs text-slate-400 transition hover:text-red-500"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, COMMENT_MAX))}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          placeholder={f.addComment}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#0b1016]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy || !text.trim()}
          className="shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-emerald-950 transition hover:brightness-105 disabled:opacity-50"
        >
          {f.send}
        </button>
      </div>

      {err ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</p> : null}
    </div>
  );
}