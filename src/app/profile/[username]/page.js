// qup-pulse-admin/src/app/profile/[username]/page.js
'use client';

// Public profile — read-only view of another user, with follow/unfollow,
// report and block. Localized via useLang().
//
// API:  GET    /users/:username     (optionalAuth — JWT gives followedByMe)
//         -> { profile: { id, username, displayName, photos, avatarUrl, online,
//                         age, gender, locationLabel,
//                         followerCount, followingCount, followedByMe },
//              posts: [ toClient() ] }
//       POST   /users/:id/follow    -> { following: true }
//       DELETE /users/:id/follow    -> { following: false }
//       POST   /users/:id/report    body { reason, note }
//       POST   /users/:id/block
//
// age / gender / locationLabel come from the extended toPublic(). locationLabel
// is already coarsened + gated server-side (see User.coarseLocation) — the raw
// locationName never reaches this page, so it can be rendered as-is.
//
// NOTE: toPublic() carries no bio, so none is shown here (server-side gap).
// Viewing your own username redirects to /profile, which is editable.

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getToken } from '../../../lib/api';
import { useLang } from '../../../context/LandingLang';
import AppNav from '../../../components/AppNav';
import {
    getPublicProfile, followUser, unfollowUser, getMyProfile,
    reportUser, blockUser, openConversation,
} from '../../../lib/profileSettingsApi';

// Mirrors REPORT_REASONS in server/src/models/Report.js. Kept in sync by hand:
// a value not in that enum fails schema validation with a 500.
const REPORT_REASONS = ['spam', 'harassment', 'inappropriate', 'misinformation', 'other'];

export default function PublicProfilePage() {
    const router = useRouter();
    const params = useParams();
    const username = decodeURIComponent(String(params?.username || ''));
    const { t } = useLang();
    const p = t.app.profile;
    const s = t.app.settings;

    const [ready, setReady] = useState(false);
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [modal, setModal] = useState(null); // 'report' | 'block' | null
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        if (!getToken()) { router.replace('/'); return; }
        let cancelled = false;

        (async () => {
            try {
                // If this is my own username, send me to the editable page instead.
                const me = await getMyProfile().catch(() => null);
                if (me?.username && me.username === username) {
                    router.replace('/profile');
                    return;
                }
                const data = await getPublicProfile(username);
                if (cancelled) return;
                setProfile(data.profile || null);
                setPosts(Array.isArray(data.posts) ? data.posts : []);
            } catch (e) {
                if (!cancelled) setError(e.message || p.loadFailed);
            } finally {
                if (!cancelled) setReady(true);
            }
        })();

        return () => { cancelled = true; };
    }, [router, username]);
    // Find-or-create the thread, then navigate. The server returns 'pending'
    // for a new thread — the recipient still has to accept before it leaves
    // their requests inbox — but the initiator can open and write to it either
    // way, so we navigate regardless of status.
    async function message() {
        if (!profile?.id) return;
        setBusy(true);
        setError('');
        try {
            const r = await openConversation(profile.id);
            router.push(`/messages/${r.conversationId}`);
        } catch (e) {
            setError(e.message || p.messageFailed);
            setBusy(false);
        }
    }
    async function toggleFollow() {
        if (!profile?.id) return;
        setBusy(true);
        setError('');
        const wasFollowing = profile.followedByMe;
        try {
            const r = wasFollowing ? await unfollowUser(profile.id) : await followUser(profile.id);
            setProfile((prev) => ({
                ...prev,
                followedByMe: Boolean(r.following),
                followerCount: Math.max(0, (prev.followerCount || 0) + (r.following ? 1 : -1)),
            }));
        } catch (e) {
            setError(e.message || p.followFailed);
        } finally {
            setBusy(false);
        }
    }

    if (!ready) {
        return (
            <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-500 dark:bg-[#0b1016] dark:text-slate-400">
                {s.loading}
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-100">
                <AppNav />
                <main className="mx-auto max-w-2xl px-6 py-8">
                    <p className="rounded-2xl border border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-[#131c26] dark:text-slate-400 dark:shadow-none">
                        {error || p.notFound}
                    </p>
                </main>
            </div>
        );
    }

    const avatar = profile.avatarUrl || profile.photos?.[0]?.url || '';
    const name = profile.displayName || profile.username;

    // Any of these may be absent: age is null without a dob, gender is unset
    // until onboarding, locationLabel is '' when showDistance is off. Each cell
    // is dropped rather than rendered as a dash, so the strip stays honest.
    const facts = [
        profile.age != null ? { key: 'age', label: p.age, value: String(profile.age) } : null,
        profile.gender ? { key: 'gender', label: s.gender, value: t.app.genders[profile.gender] || profile.gender } : null,
        profile.locationLabel ? { key: 'loc', label: p.location, value: profile.locationLabel } : null,
        profile.distanceKm != null ? { key: 'dist', label: p.distance, value: `~${profile.distanceKm} km` } : null,
    ].filter(Boolean);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-100">
            <AppNav />
            <main className="mx-auto max-w-2xl px-6 py-8">
                {error ? (
                    <p className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
                        {error}
                    </p>
                ) : null}

                <div className="mb-4 rounded-2xl border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#131c26] dark:shadow-none">
                    <div className="flex items-start gap-5">
                        <div className="relative shrink-0">
                            <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800">
                                {avatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={avatar} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-2xl font-semibold">{name.slice(0, 1).toUpperCase()}</span>
                                )}
                            </div>
                            {profile.online ? (
                                <span
                                    className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-400 dark:border-[#131c26]"
                                    aria-label={p.online}
                                />
                            ) : null}
                        </div>

                        <div className="min-w-0 flex-1">
                            <h1 className="truncate text-xl font-bold text-slate-900 dark:text-white">{name}</h1>
                            <p className="truncate text-sm text-slate-500 dark:text-slate-400">@{profile.username}</p>
                            <div className="mt-2 flex gap-4 text-sm">
                                <span><span className="font-semibold">{profile.followerCount ?? 0}</span>{' '}
                                    <span className="text-slate-500 dark:text-slate-400">{p.followers}</span></span>
                                <span><span className="font-semibold">{profile.followingCount ?? 0}</span>{' '}
                                    <span className="text-slate-500 dark:text-slate-400">{p.following}</span></span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={message}
                            disabled={busy}
                            className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            {p.message}
                        </button>
                        <div className="flex shrink-0 items-center gap-2">
                            <button
                                type="button"
                                onClick={toggleFollow}
                                disabled={busy}
                                className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition disabled:opacity-50 ${profile.followedByMe
                                    ? 'border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                                    : 'bg-emerald-500 text-emerald-950 hover:brightness-105'
                                    }`}
                            >
                                {busy ? '…' : (profile.followedByMe ? p.unfollow : p.follow)}
                            </button>

                            {/* Overflow menu — report/block live here rather than as primary
                  buttons: they're rare, destructive, and shouldn't sit next to
                  Follow where a mis-tap is easy. */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setMenuOpen((v) => !v)}
                                    aria-haspopup="menu"
                                    aria-expanded={menuOpen}
                                    aria-label={p.moreActions}
                                    className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                                >
                                    ⋯
                                </button>
                                {menuOpen ? (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                                        <div
                                            role="menu"
                                            className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-lg dark:border-slate-800 dark:bg-[#131c26] dark:shadow-none"
                                        >
                                            <button
                                                role="menuitem"
                                                onClick={() => { setMenuOpen(false); setModal('report'); }}
                                                className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50"
                                            >
                                                {p.report}
                                            </button>
                                            <button
                                                role="menuitem"
                                                onClick={() => { setMenuOpen(false); setModal('block'); }}
                                                className="block w-full border-t border-slate-200 px-4 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-slate-800 dark:text-red-400 dark:hover:bg-red-500/10"
                                            >
                                                {p.block}
                                            </button>
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {/* Facts strip — age / gender / location */}
                    {facts.length > 0 ? (
                        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                            {facts.map((f) => (
                                <div key={f.key}>
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                        {f.label}
                                    </dt>
                                    <dd className="mt-0.5 text-[15px] text-slate-800 dark:text-slate-200">{f.value}</dd>
                                </div>
                            ))}
                        </dl>
                    ) : null}
                </div>

                {/* Posts */}
                <h2 className="mb-2 mt-6 px-1 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {p.posts}
                </h2>
                {posts.length === 0 ? (
                    <div className="rounded-2xl border border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-[#131c26] dark:text-slate-400 dark:shadow-none">
                        {p.noPosts}
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm dark:border-slate-800 dark:bg-[#131c26] dark:shadow-none">
                        {posts.map((post, i) => (
                            <article
                                key={post.id || i}
                                className={`px-5 py-4 ${i === posts.length - 1 ? '' : 'border-b border-slate-200 dark:border-slate-800'}`}
                            >
                                {post.text ? (
                                    <p className="whitespace-pre-wrap text-[15px] text-slate-800 dark:text-slate-200">{post.text}</p>
                                ) : null}
                                {post.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={post.imageUrl} alt="" className="mt-3 max-h-80 w-full rounded-xl object-cover" />
                                ) : null}
                                {post.createdAt ? (
                                    <p className="mt-2 text-xs text-slate-400 dark:text-slate-600">
                                        {new Date(post.createdAt).toLocaleDateString()}
                                    </p>
                                ) : null}
                            </article>
                        ))}
                    </div>
                )}
            </main>

            {modal === 'report' && (
                <ReportModal
                    userId={profile.id}
                    name={name}
                    onClose={() => setModal(null)}
                />
            )}
            {modal === 'block' && (
                <BlockModal
                    userId={profile.id}
                    name={name}
                    onClose={() => setModal(null)}
                    onBlocked={() => router.replace('/discover')}
                />
            )}
        </div>
    );
}

/* ---------- modals ---------- */

function ModalShell({ title, children, onClose }) {
    return (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/50 p-4" onClick={onClose}>
            <div
                className="w-full max-w-sm rounded-2xl border border-slate-300 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#131c26] dark:shadow-none"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
                {children}
            </div>
        </div>
    );
}

function ReportModal({ userId, name, onClose }) {
    const { t } = useLang();
    const p = t.app.profile;
    const c = t.app.common;
    const [reason, setReason] = useState('');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');
    const [done, setDone] = useState(false);

    async function submit() {
        if (!reason) return setErr(p.err.pickReason);
        setSaving(true);
        setErr('');
        try {
            await reportUser(userId, { reason, note: note.trim() });
            setDone(true);
        } catch (e) {
            setErr(e.message || p.err.reportFailed);
        } finally {
            setSaving(false);
        }
    }

    if (done) {
        return (
            <ModalShell title={p.reportSent} onClose={onClose}>
                <p className="text-sm text-slate-600 dark:text-slate-300">{p.reportSentBody}</p>
                <div className="mt-5 flex justify-end">
                    <button onClick={onClose} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950">
                        {c.done}
                    </button>
                </div>
            </ModalShell>
        );
    }

    return (
        <ModalShell title={`${p.report} ${name}`} onClose={onClose}>
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{p.reportIntro}</p>

            <div className="space-y-1">
                {REPORT_REASONS.map((r) => (
                    <button
                        key={r}
                        type="button"
                        onClick={() => setReason(r)}
                        className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm transition ${reason === r
                            ? 'border-emerald-500 bg-emerald-500/10 font-medium text-emerald-700 dark:text-emerald-300'
                            : 'border-slate-300 hover:border-slate-400 dark:border-slate-700'
                            }`}
                    >
                        <span>{p.reasons[r]}</span>
                        {reason === r ? <span className="text-emerald-500">✓</span> : null}
                    </button>
                ))}
            </div>

            <label className="mb-1 mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {p.reportNote}
            </label>
            <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                rows={3}
                placeholder={p.reportNotePlaceholder}
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#0b1016]"
            />
            <p className="mt-1 text-right text-xs text-slate-400 dark:text-slate-600">{note.length}/500</p>

            {err ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</p> : null}

            <div className="mt-5 flex justify-end gap-3">
                <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                    {c.cancel}
                </button>
                <button
                    onClick={submit}
                    disabled={saving || !reason}
                    className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:brightness-105 disabled:opacity-50"
                >
                    {saving ? c.saving : p.sendReport}
                </button>
            </div>
        </ModalShell>
    );
}

function BlockModal({ userId, name, onClose, onBlocked }) {
    const { t } = useLang();
    const p = t.app.profile;
    const c = t.app.common;
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');

    async function submit() {
        setSaving(true);
        setErr('');
        try {
            await blockUser(userId);
            // The profile is unviewable once blocked, so staying here would show a
            // dead page. Leave rather than re-fetch into an error.
            onBlocked();
        } catch (e) {
            setErr(e.message || p.err.blockFailed);
            setSaving(false);
        }
    }

    return (
        <ModalShell title={`${p.block} ${name}?`} onClose={onClose}>
            <p className="text-sm text-slate-600 dark:text-slate-300">{p.blockBody}</p>
            {err ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</p> : null}
            <div className="mt-5 flex justify-end gap-3">
                <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                    {c.cancel}
                </button>
                <button
                    onClick={submit}
                    disabled={saving}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                    {saving ? c.saving : p.block}
                </button>
            </div>
        </ModalShell>
    );
}