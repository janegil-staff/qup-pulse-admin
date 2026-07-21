// qup-pulse-admin/src/components/PostCard.js
'use client';

// Shared post card — used by /feed and /saved. Extracted from feed/page.js so
// both pages render posts identically; a second copy would drift the moment
// either page gained a feature.
//
// Post shape is Post.toClient(viewerId): { id, author: toPublic(), text, type,
// placeName?, imageUrl?, likeCount, likedByMe, savedByMe?, commentCount,
// createdAt }.
//
// commentCount is returned by /posts/feed (computed on read via one grouped
// aggregation — see postController.getFeed). The comment button shows the count
// when > 0. The expanded Comments panel keeps that badge in sync as the viewer
// adds or deletes comments, via onCountChange -> onPatch.
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
//
// MODERATION_MENU_V1 — the `⋯` opens Report post / Block user, mirroring the
// shipped mobile app. App Store / Play review for UGC expects both reachable
// from the content itself, not buried in a profile page.
//
// onAuthorBlocked(authorId) is optional: passed by pages that own a list they
// can prune (/feed, /saved). Without it a block still succeeds and the server
// filters that author out on the next load — the row just lingers until then.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLang } from '../context/LandingLang';
import {
  toggleLike, toggleSave, listComments, addComment, deleteComment,
  reportPost, blockUser, REPORT_REASONS,
} from '../lib/feedApi';

const COMMENT_MAX = 500;
const NOTE_MAX = 500; // matches Report.note maxlength server-side

export default function PostCard({ post, onPatch, onUnsaved, onAuthorBlocked }) {
  const { t } = useLang();
  const f = t.app.feed;

  const [busyLike, setBusyLike] = useState(false);
  const [busySave, setBusySave] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState(null); // null | 'report' | 'block'
  const menuRef = useRef(null);

  const author = post.author || {};
  const avatar = author.avatarUrl || author.photos?.[0]?.url || '';
  const name = author.displayName || author.username || '—';

  // Count shown on the comment button. Falls back to 0 when the feed endpoint
  // didn't supply it (e.g. /posts/following). Kept live by <Comments> below.
  const commentCount = post.commentCount ?? 0;

  // Close the overflow menu on outside click / Escape. Without this the menu
  // stays open when the user clicks another card's `⋯`.
  useEffect(() => {
    if (!menuOpen) return undefined;
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

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

  function openDialog(which) {
    setMenuOpen(false);
    setDialog(which);
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

        {/* Overflow menu — anchored to the header so it sits away from the
            like/save row and can't be mistaken for a content action. */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={f.postOptions}
            title={f.postOptions}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <span aria-hidden="true" className="text-lg leading-none">⋯</span>
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-slate-300 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-[#1a2530]"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => openDialog('report')}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {f.reportPost}
              </button>
              {/* No author id (deleted account, partial payload) means there's
                  nothing to block — hide the item rather than fail on click. */}
              {author.id ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openDialog('block')}
                  className="block w-full px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  {f.blockUser}
                </button>
              ) : null}
            </div>
          ) : null}
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
          {/* Icon always; the count only appears once there's at least one
              comment, mirroring "♥ {n}" on the like button. */}
          💬 {showComments ? f.hideComments : f.comments}
          {commentCount > 0 ? ` (${commentCount})` : ''}
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

      {showComments ? (
        <Comments
          postId={post.id}
          onCountChange={(n) => onPatch(post.id, { commentCount: n })}
        />
      ) : null}

      {dialog === 'report' ? (
        <ReportDialog post={post} onClose={() => setDialog(null)} />
      ) : null}

      {dialog === 'block' ? (
        <BlockDialog
          author={author}
          onClose={() => setDialog(null)}
          onBlocked={() => {
            setDialog(null);
            onAuthorBlocked?.(author.id);
          }}
        />
      ) : null}
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

/* ---------- moderation dialogs ---------- */

// Shared shell: fixed backdrop, click-outside and Escape to dismiss. Mobile
// gets this free from Alert.alert; on the web it has to be built.
function Modal({ title, children, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm rounded-2xl border border-slate-300 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-[#131c26]"
      >
        <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {children}
      </div>
    </div>
  );
}

// Reason keys are a server contract (REPORT_REASONS); labels come from
// t.app.feed.reasons.*. A missing translation falls back to the raw key rather
// than rendering blank.
function ReportDialog({ post, onClose }) {
  const { t } = useLang();
  const f = t.app.feed;
  const c = t.app.common;

  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!reason) return;
    setBusy(true);
    setErr('');
    try {
      await reportPost(post.id, reason, note.trim());
      setSent(true);
    } catch (e) {
      setErr(e.message || f.reportFailed);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <Modal title={f.reportThanksTitle} onClose={onClose}>
        <p className="text-sm text-slate-600 dark:text-slate-300">{f.reportThanksBody}</p>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-emerald-950 transition hover:brightness-105"
          >
            {c.close || 'OK'}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={f.reportPost} onClose={onClose}>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{f.reportWhy}</p>

      <div className="space-y-1">
        {REPORT_REASONS.map((key) => (
          <label
            key={key}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <input
              type="radio"
              name={`report-reason-${post.id}`}
              value={key}
              checked={reason === key}
              onChange={() => setReason(key)}
              className="accent-emerald-500"
            />
            {f.reasons?.[key] || key}
          </label>
        ))}
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
        rows={2}
        placeholder={f.reportNotePlaceholder}
        className="mt-3 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#0b1016]"
      />

      {err ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</p> : null}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {c.cancel || 'Cancel'}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !reason}
          className="rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-emerald-950 transition hover:brightness-105 disabled:opacity-50"
        >
          {busy ? c.saving : f.reportSubmit}
        </button>
      </div>
    </Modal>
  );
}

function BlockDialog({ author, onClose, onBlocked }) {
  const { t } = useLang();
  const f = t.app.feed;
  const c = t.app.common;

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const name = author.displayName || author.username || '—';

  async function confirm() {
    setBusy(true);
    setErr('');
    try {
      await blockUser(author.id);
      onBlocked();
    } catch (e) {
      setErr(e.message || f.blockFailed);
      setBusy(false);
    }
  }

  return (
    <Modal title={(f.blockTitle || 'Block {name}?').replace('{name}', name)} onClose={onClose}>
      <p className="text-sm text-slate-600 dark:text-slate-300">{f.blockBody}</p>

      {err ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</p> : null}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {c.cancel || 'Cancel'}
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="rounded-lg bg-red-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
        >
          {busy ? c.saving : f.blockConfirm}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- comments (loaded on demand) ---------- */

// The feed now carries commentCount (see postController.getFeed), so the badge
// renders without opening the panel. The actual comment LIST still loads only
// when a post is expanded — fetching every thread on render would be an N+1
// across the page. onCountChange keeps the parent's badge in sync as the viewer
// adds or deletes comments here, without a feed refetch.
function Comments({ postId, onCountChange }) {
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
      .then((cs) => {
        if (cancelled) return;
        setList(cs);
        // Reconcile the badge with the authoritative loaded count.
        onCountChange?.(cs.length);
      })
      .catch((e) => { if (!cancelled) { setErr(e.message || f.commentsFailed); setList([]); } });
    return () => { cancelled = true; };
    // onCountChange intentionally omitted: it's a fresh closure each render and
    // would re-run this effect on every parent update. postId is the real dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, f]);

  async function submit() {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setErr('');
    try {
      const c = await addComment(postId, body.slice(0, COMMENT_MAX));
      setList((prev) => {
        const next = [...(prev || []), c];
        onCountChange?.(next.length);
        return next;
      });
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
      setList((prev) => {
        const next = (prev || []).filter((c) => String(c.id) !== String(id));
        onCountChange?.(next.length);
        return next;
      });
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