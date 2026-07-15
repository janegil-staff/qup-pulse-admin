// qup-pulse-admin/src/components/PostCard.js
'use client';

// Shared post card — used by /feed and /saved. Extracted from feed/page.js so
// both pages render posts identically; a second copy would drift the moment
// either page gained a feature.
//
// Post shape is Post.toClient(viewerId): { id, author: toPublic(), text, type,
// placeName?, imageUrl?, likeCount, likedByMe, savedByMe?, createdAt }.
//
// savedByMe is NOT returned by /posts/following (only /posts/feed and
// /posts/saved pass the viewer to toClient), so on that tab the flag starts
// undefined and the Save button reads unsaved until the user toggles it. That's
// a server gap, not a bug here.
//
// onPatch(id, patch) lets the parent own the list; the card holds only its own
// busy flags. onUnsaved(id) is optional and passed ONLY by /saved — it both
// drops the row from that list and switches the button label from a status
// ("Saved") to an action ("Remove"), since on a page of saved posts a button
// reading "Saved" says nothing.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLang } from '../context/LandingLang';
import {
  toggleLike, toggleSave, listComments, addComment, deleteComment,
} from '../lib/feedApi';

const COMMENT_MAX = 500;

export default function PostCard({ post, onPatch, onUnsaved }) {
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
      // On /saved, unsaving means the post no longer belongs in the list. The
      // toggle is already persisted, so this is a local drop, not a refetch.
      if (!r.saved && onUnsaved) onUnsaved(post.id);
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
          {/* "Remove" only on /saved, where onUnsaved is passed and every post is
              already saved. On /feed the label stays a status, matching the like
              button beside it. */}
          {post.savedByMe ? (onUnsaved ? f.remove : f.saved) : f.save}
        </button>
      </div>

      {showComments ? <Comments postId={post.id} /> : null}
    </article>
  );
}

// Exported: feed's Composer doesn't need it, but Comments below does, and any
// future list of people can reuse it rather than growing a third copy.
export function Avatar({ src, name }) {
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

// Post.toClient() carries no commentCount and there's no count endpoint, so
// comments load only when a post is expanded. Fetching them on render would be
// an N+1 across the whole page.
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
              <Avatar
                src={c.author?.avatarUrl || c.author?.photos?.[0]?.url || ''}
                name={c.author?.displayName || c.author?.username}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {c.author?.displayName || c.author?.username || '—'}
                </p>
                <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{c.text}</p>
              </div>
              {/* The server enforces who may delete; this ✕ shows on every comment
                  and 403s on someone else's. Worth gating on author id once
                  toClient() exposes enough to compare. */}
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