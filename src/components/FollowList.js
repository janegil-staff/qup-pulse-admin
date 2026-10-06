// qup-pulse-admin/src/components/FollowList.js
'use client';

// Followers / following list. One component for both lists and for both
// profiles (own + public) — the four route files are thin wrappers around it:
//
//   /followers, /following                      -> own lists
//   /profile/[username]/followers | /following  -> someone else's
//
// Props:
//   mode      'followers' | 'following'
//   username  whose list. Omit for the logged-in user's own.
//
// API:  GET    /users/:id/followers?before=  -> { users, nextBefore }
//       GET    /users/:id/following?before=  -> { users, nextBefore }
//       POST   /users/:id/follow             -> { following: true }
//       DELETE /users/:id/follow             -> { following: false }
//
// The list endpoints take an id, the URL carries a username, so the owner is
// resolved first (GET /me, or GET /users/:username for a public profile).

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken } from '../lib/api';
import { useLang } from '../context/LandingLang';
import { useInfiniteScroll } from '../lib/useInfiniteScroll';
import AppNav from './AppNav';
import {
  getMyProfile, getPublicProfile, getFollowers, getFollowing,
  followUser, unfollowUser,
} from '../lib/profileSettingsApi';

const uid = (u) => u?.id || u?._id || '';
const avatarOf = (u) => u?.avatarUrl || u?.photos?.[0]?.url || u?.photo?.url || '';

export default function FollowList({ mode = 'followers', username = '' }) {
  const router = useRouter();
  const { t } = useLang();
  const p = t.app.profile;
  const s = t.app.settings;

  const isFollowers = mode === 'followers';
  const fetchList = isFollowers ? getFollowers : getFollowing;

  const [ready, setReady] = useState(false);
  const [owner, setOwner] = useState(null); // { id, username }
  const [myId, setMyId] = useState('');
  const [users, setUsers] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!getToken()) { router.replace('/'); return undefined; }
    let cancelled = false;

    (async () => {
      try {
        const me = await getMyProfile();
        const mine = !username || me?.username === username;
        const target = mine ? me : (await getPublicProfile(username)).profile;
        const targetId = uid(target);
        if (!targetId) throw new Error(p.notFound);

        const data = await fetchList(targetId);
        if (cancelled) return;
        setMyId(uid(me));
        setOwner({ id: targetId, username: target.username, mine });
        setUsers(data.users);
        setCursor(data.nextBefore);
      } catch (e) {
        if (!cancelled) setError(e.message || p.loadFailed);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => { cancelled = true; };
    // fetchList follows mode; p only supplies fallback copy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, username, mode]);

  // nextBefore is null on the last page. loadingMore stops the observer from
  // requesting the same page twice while the list settles.
  const loadMore = useCallback(async () => {
    if (!owner?.id || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchList(owner.id, { before: cursor });
      setUsers((prev) => {
        const seen = new Set(prev.map(uid));
        return [...prev, ...data.users.filter((u) => !seen.has(uid(u)))];
      });
      setCursor(data.nextBefore);
    } catch {
      // Transient — stop paging rather than loop on a failing request. The
      // rows already loaded stay readable.
      setCursor(null);
    } finally {
      setLoadingMore(false);
    }
  }, [owner, cursor, loadingMore, fetchList]);

  const sentinelRef = useInfiniteScroll({
    hasMore: Boolean(cursor),
    loading: loadingMore,
    onLoadMore: loadMore,
  });

  async function toggleFollow(user) {
    const id = uid(user);
    if (!id) return;
    setBusyId(id);
    setError('');
    try {
      const r = user.followedByMe ? await unfollowUser(id) : await followUser(id);
      // The row stays put after an unfollow, even on your own Following list:
      // a row vanishing under the cursor makes a mis-click unrecoverable.
      setUsers((prev) =>
        prev.map((u) => (uid(u) === id ? { ...u, followedByMe: Boolean(r.following) } : u)),
      );
    } catch (e) {
      setError(e.message || p.followFailed);
    } finally {
      setBusyId(null);
    }
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-500 dark:bg-[#0b1016] dark:text-slate-400">
        {s.loading}
      </div>
    );
  }

  const backHref = owner && !owner.mine
    ? `/profile/${encodeURIComponent(owner.username)}`
    : '/profile';
  const title = isFollowers ? p.followers : p.following;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-100">
      <AppNav />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <Link
          href={backHref}
          className="mb-4 inline-block text-sm font-medium text-emerald-600 no-underline hover:underline dark:text-emerald-400"
        >
          ‹ {owner?.username ? `@${owner.username}` : p.title}
        </Link>

        <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>

        {error ? (
          <p className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {users.length === 0 ? (
          error ? null : (
            <div className="rounded-2xl border border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-[#131c26] dark:text-slate-400 dark:shadow-none">
              {isFollowers ? p.noFollowers : p.noFollowing}
            </div>
          )
        ) : (
          <div className="mb-4 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm dark:border-slate-800 dark:bg-[#131c26] dark:shadow-none">
            {users.map((u, i) => {
              const id = uid(u);
              const avatar = avatarOf(u);
              const busy = busyId === id;
              // No button on your own row — the server rejects a self-follow.
              const isSelf = u.isSelf ?? (Boolean(myId) && id === myId);
              const href = isSelf ? '/profile' : `/profile/${encodeURIComponent(u.username)}`;

              return (
                <div
                  key={id || i}
                  className={`flex items-center justify-between gap-3 px-5 py-4 ${
                    i === users.length - 1 ? '' : 'border-b border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Link href={href} className="flex min-w-0 items-center gap-3 text-inherit no-underline">
                    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-300 bg-slate-100 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span>{(u.displayName || u.username || '?').slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                        {u.displayName || u.username || '—'}
                      </p>
                      {u.username ? (
                        <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                          @{u.username}
                        </p>
                      ) : null}
                    </div>
                  </Link>

                  {isSelf ? null : (
                    <button
                      type="button"
                      onClick={() => toggleFollow(u)}
                      disabled={busy}
                      className={`shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition disabled:opacity-50 ${
                        u.followedByMe
                          ? 'border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                          : 'bg-emerald-500 text-emerald-950 hover:brightness-105'
                      }`}
                    >
                      {busy ? '…' : (u.followedByMe ? p.unfollow : p.follow)}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {cursor ? <div ref={sentinelRef} className="h-px" /> : null}
        {loadingMore ? (
          <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">{s.loading}</p>
        ) : null}
      </main>
    </div>
  );
}
