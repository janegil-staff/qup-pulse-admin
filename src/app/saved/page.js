// qup-pulse-admin/src/app/saved/page.js
'use client';

// Saved posts — /posts/saved, the posts the viewer has bookmarked.
// LOGGED-IN ONLY. Reached from the Saved posts link on /profile.
// Localized via useLang() (t.app.saved.* + t.app.feed.* via PostCard).
//
// API:  GET /posts/saved -> { posts: [toClient() + savedByMe] }
//
// No composer and no tabs: this is a filtered view, not a feed. Unsaving a post
// drops it from the list immediately (onUnsaved) rather than leaving a row that
// contradicts the page it's on.
//
// listSaved's response is NOT paginated server-side the way /posts/feed is —
// verify before adding a Load more button here.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '../../lib/api';
import { useLang } from '../../context/LandingLang';
import AppNav from '../../components/AppNav';
import PostCard from '../../components/PostCard';
import { listSaved } from '../../lib/feedApi';

export default function SavedPage() {
  const router = useRouter();
  const { t } = useLang();
  const sv = t.app.saved;
  const s = t.app.settings;

  const [ready, setReady] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPosts(await listSaved());
    } catch (e) {
      setError(e.message || sv.loadFailed);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [sv.loadFailed]);

  useEffect(() => {
    if (!getToken()) { router.replace('/'); return; }
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  function patchPost(id, patch) {
    setPosts((prev) => prev.map((p) => (String(p.id) === String(id) ? { ...p, ...patch } : p)));
  }

  // Unsaved here means it leaves the list. The toggle is already persisted by
  // the time this fires, so no refetch — just drop the row.
  function dropPost(id) {
    setPosts((prev) => prev.filter((p) => String(p.id) !== String(id)));
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
        <h1 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">{sv.title}</h1>

        {error ? (
          <p className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="grid place-items-center py-20 text-slate-500 dark:text-slate-400">{s.loading}</div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-[#131c26] dark:text-slate-400 dark:shadow-none">
            {sv.empty}
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard
                key={String(post.id)}
                post={post}
                onPatch={patchPost}
                onUnsaved={dropPost}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}