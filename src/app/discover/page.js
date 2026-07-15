// qup-pulse-admin/src/app/discover/page.js
'use client';

// Web Discover — a grid of people nearby, mirroring the app's DiscoveryScreen.
// LOGGED-IN ONLY: redirects to / if there's no token. Live data from /discovery.
// Emerald/dark theme, follows the site's light/dark toggle.
//
// Each card links to /profile/[username]. A card without a username renders
// unlinked rather than pointing at /profile/undefined.
//
// Privacy note: this shows real users' photos, ages, and approximate distances,
// so it is deliberately behind auth. Do NOT make this route public.

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken } from '../../lib/api';
import AppNav from '../../components/AppNav';
import {
    getDiscovery, updateLocation, clearBrowseLocation, extractPeople, avatarUrl,
} from '../../lib/discoverApi';

export default function DiscoverPage() {
    const router = useRouter();
    const [ready, setReady] = useState(false);
    const [people, setPeople] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [browsingFrom, setBrowsingFrom] = useState(null);
    const [browsingElsewhere, setBrowsingElsewhere] = useState(false);

    const load = useCallback(async () => {
        setError('');
        try {
            // Push a fresh location so results are geo-accurate, then fetch.
            // Best-effort: geolocation may be denied or unsupported — proceed anyway.
            await new Promise((resolve) => {
                if (!('geolocation' in navigator)) return resolve();
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        try { await updateLocation(pos.coords.longitude, pos.coords.latitude); } catch { /* ignore */ }
                        resolve();
                    },
                    () => resolve(),
                    { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
                );
            });

            const data = await getDiscovery();
            setPeople(extractPeople(data));
            setBrowsingFrom(data.browsingFrom ?? null);
            setBrowsingElsewhere(Boolean(data.browsingElsewhere));
        } catch (e) {
            setError(e?.message ?? 'Could not load people nearby');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Auth gate + initial load.
    useEffect(() => {
        if (!getToken()) { router.replace('/'); return; }
        setReady(true);
        load();
    }, [router, load]);

    function onRefresh() { setRefreshing(true); load(); }

    async function browseNearMeAgain() {
        setLoading(true);
        try { await clearBrowseLocation(); } catch { /* reload anyway */ }
        load();
    }

    if (!ready) {
        return (
            <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-500 dark:bg-[#0b1016] dark:text-slate-400">
                Loading…
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-100">
            <AppNav />
            <div className="border-b border-slate-200 dark:border-slate-800">
                <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
                    <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {browsingFrom || 'People nearby'}
                    </div>
                    <button
                        onClick={onRefresh}
                        disabled={refreshing || loading}
                        className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-sm transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                        {refreshing ? 'Refreshing…' : 'Refresh'}
                    </button>
                </div>
                {browsingElsewhere ? (
                    <button
                        onClick={browseNearMeAgain}
                        className="w-full border-t border-slate-200 bg-slate-100 py-2.5 text-sm font-semibold text-emerald-600 transition hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800/50 dark:text-emerald-400 dark:hover:bg-slate-800"
                    >
                        Browse near me again
                    </button>
                ) : null}
            </div>

            <main className="mx-auto max-w-4xl px-4 py-4">
                {loading ? (
                    <div className="grid place-items-center py-24 text-slate-500 dark:text-slate-400">Loading…</div>
                ) : people.length === 0 ? (
                    <p className="mx-auto max-w-sm py-24 text-center text-slate-500 dark:text-slate-400">
                        {error || 'No one nearby yet. Refresh, or widen your distance in the app settings.'}
                    </p>
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        {people.map((p) => (
                            <PersonCard key={String(p.id ?? p._id ?? p.username)} person={p} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

function PersonCard({ person }) {
    const name = person.displayName || person.username || 'Someone';
    const src = avatarUrl(person);

    const card = (
        <div className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 transition dark:border-slate-800 dark:bg-slate-800">
            {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" className="h-full w-full object-cover" />
            ) : (
                <div className="grid h-full w-full place-items-center text-2xl font-extrabold text-slate-400">
                    {name.slice(0, 1).toUpperCase()}
                </div>
            )}
       
            {person.emailVerified ? (
                <span className="absolute left-1.5 top-1.5 flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-full bg-black/55 px-1.5 py-[3px] text-[9px] font-bold text-white">
                    <span className="grid h-2.5 w-2.5 place-items-center rounded-full bg-emerald-400 text-[7px] text-emerald-950">✓</span>
                    <span className="truncate">Email confirmed</span>
                </span>
            ) : null}

            {person.online ? (
                <span className="absolute right-1.5 top-1.5 h-4 w-4 rounded-full border-2 border-white bg-[#3BD16F]" />
            ) : null}

            <div className="absolute inset-x-0 bottom-0 bg-black/65 px-1.5 py-1.5">
                <p className="truncate text-xs font-bold text-white">
                    {name}{person.age ? `, ${person.age}` : ''}
                </p>
                {person.distanceKm != null ? (
                    <p className="truncate text-[10px] text-white/85">~{person.distanceKm} km</p>
                ) : null}
            </div>
        </div>
    );

    // No username means no profile route to point at — render the card unlinked
    // rather than sending the user to /profile/undefined.
    if (!person.username) return card;

    return (
        <Link
            href={`/profile/${encodeURIComponent(person.username)}`}
            aria-label={name}
            className="block no-underline transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-xl dark:focus-visible:ring-offset-[#0b1016]"
        >
            {card}
        </Link>
    );
}