// qup-pulse-admin/src/app/profile/page.js
'use client';

// Own profile — view + edit (photo, display name, bio).
// LOGGED-IN ONLY (redirects to / without a token). Localized via useLang().
//
// API:  GET   /me                        -> { profile: toSelf() }
//       PATCH /me                        { displayName, bio, photos }
//       POST  /upload  (multipart)       -> { url, publicId }
//       POST  /auth/resend-verification  -> { ok }
//
// Photos are replace-in-full on PATCH: the server destroys any photo dropped
// from the array, so the edit modal always sends the whole list.
//
// The ADMIN badge is here and nowhere else. toPublic() deliberately omits role,
// so it cannot leak to other users' view of you — on a proximity-based social
// app, a public list of who the staff are is a targeting list. isAdmin() reads
// localStorage, which is a UI hint, not a claim: every /admin/* route re-checks
// server-side via requireAdmin.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, isAdmin } from '../../lib/api';
import { useLang } from '../../context/LandingLang';
import AppNav from '../../components/AppNav';
import {
    getMyProfile, updateMyProfile, uploadImage, resendVerification,
} from '../../lib/profileSettingsApi';

const BIO_MAX = 300;
const NAME_MAX = 40;

export default function ProfilePage() {
    const router = useRouter();
    const { t } = useLang();
    const p = t.app.profile;
    const s = t.app.settings;

    const [ready, setReady] = useState(false);
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(false);
    const [admin, setAdmin] = useState(false);
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);

    const reload = async () => setProfile(await getMyProfile());

    useEffect(() => {
        if (!getToken()) { router.replace('/'); return; }
        reload()
            .then(() => setReady(true))
            .catch((e) => { setError(e.message || p.loadFailed); setReady(true); });
    }, [router]);

    // localStorage is client-only — reading it during render would mismatch the
    // server-rendered HTML and hydrate wrong.
    useEffect(() => {
        setAdmin(isAdmin());
    }, []);

    // Re-send the confirmation link. The success state is sticky for the rest of
    // the session — a button that returns to "Send again" invites the user to
    // hammer it into the rate limiter while the first mail is still in flight.
    async function resend() {
        setResending(true);
        setError('');
        try {
            await resendVerification();
            setResent(true);
        } catch (e) {
            setError(e.message || p.verifyEmailFailed);
        } finally {
            setResending(false);
        }
    }

    if (!ready) {
        return (
            <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-500 dark:bg-[#0b1016] dark:text-slate-400">
                {s.loading}
            </div>
        );
    }

    const avatar = profile?.photos?.[0]?.url || '';
    const name = profile?.displayName || profile?.username || '—';
    const facts = [
        profile.age != null ? { key: 'age', label: p.age, value: String(profile.age) } : null,
        profile.gender ? { key: 'gender', label: s.gender, value: t.app.genders[profile.gender] || profile.gender } : null,
        profile.locationName ? { key: 'locName', label: p.locationName, value: profile.locationName } : null,
        profile.language
            ? {
                key: 'lang',
                label: p.appLanguage,
                value: t.app.languages?.[profile.language] || profile.language,
            }
            : null,
    ].filter(Boolean);
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-100">
            <AppNav />
            <main className="mx-auto max-w-2xl px-6 py-8">
                <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{p.title}</h1>

                {error ? (
                    <p className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
                        {error}
                    </p>
                ) : null}

                {/* Unverified accounts still work — this nudges rather than blocks.
            Verification drives the "Email confirmed" badge others see on
            Discover, and it's how PIN reset reaches you, so it's worth
            surfacing every visit until it's done. Amber, not red: nothing is
            broken. */}
                {profile && !profile.emailVerified ? (
                    <div className="mb-4 overflow-hidden rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-white shadow-sm dark:border-amber-500/30 dark:from-amber-500/10 dark:to-transparent dark:shadow-none">
                        <div className="flex items-start gap-4 p-5">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-400/20 text-lg">
                                ✉️
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[15px] font-bold text-amber-900 dark:text-amber-200">
                                    {p.verifyEmailTitle}
                                </p>
                                <p className="mt-1 text-sm leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                                    {resent ? p.verifyEmailSent : p.verifyEmailBody}
                                </p>
                                {!resent ? (
                                    <button
                                        type="button"
                                        onClick={resend}
                                        disabled={resending}
                                        className="mt-3 rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-amber-950 shadow-sm transition hover:brightness-105 disabled:opacity-50"
                                    >
                                        {resending ? '…' : p.verifyEmailAction}
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="mb-4 rounded-2xl border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#131c26] dark:shadow-none">
                    <div className="flex items-start gap-5">
                        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800">
                            {avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={avatar} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-2xl font-semibold">{name.slice(0, 1).toUpperCase()}</span>
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <h2 className="truncate text-xl font-bold text-slate-900 dark:text-white">{name}</h2>
                                {admin ? (
                                    <span className="shrink-0 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-950">
                                        {t.app.nav.admin}
                                    </span>
                                ) : null}
                            </div>
                            <p className="truncate text-sm text-slate-500 dark:text-slate-400">@{profile?.username}</p>
                            {profile?.age ? (
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{profile.age}</p>
                            ) : null}
                            {profile?.locationName ? (
                                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{profile.locationName}</p>
                            ) : null}
                        </div>

                        <div className="flex shrink-0 flex-col items-stretch gap-2">
                            <button
                                type="button"
                                onClick={() => setEditing(true)}
                                className="w-full rounded-lg border border-slate-300 px-3.5 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                {p.edit}
                            </button>

                            {/* Saved posts. Own profile only — there's no public equivalent,
                  and the server scopes /posts/saved to the caller. */}
                            <Link
                                href="/saved"
                                className="w-full rounded-lg border border-slate-300 px-3.5 py-1.5 text-center text-sm font-semibold text-slate-600 no-underline transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                {p.savedPosts}
                            </Link>

                            {admin ? (
                                <Link
                                    href="/reports"
                                    className="w-full rounded-lg border border-slate-300 px-3.5 py-1.5 text-center text-sm font-semibold text-slate-600 no-underline transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    {t.app.nav.reports}
                                </Link>
                            ) : null}
                        </div>
                    </div>
       {/* Facts strip — age / gender / neighborhood / location / distance / language */}
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
                    {profile?.bio ? (
                        <p className="mt-5 whitespace-pre-wrap text-[15px] text-slate-700 dark:text-slate-300">{profile.bio}</p>
                    ) : (
                        <p className="mt-5 text-[15px] text-slate-400 dark:text-slate-600">{p.noBio}</p>
                    )}
                </div>
            </main>

            {editing ? (
                <EditModal
                    profile={profile}
                    onClose={() => setEditing(false)}
                    onSaved={reload}
                />
            ) : null}
        </div>
    );
}

/* ---------- edit modal ---------- */

function EditModal({ profile, onClose, onSaved }) {
    const { t } = useLang();
    const p = t.app.profile;
    const c = t.app.common;

    const [displayName, setDisplayName] = useState(profile?.displayName || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [photos, setPhotos] = useState(profile?.photos || []);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [err, setErr] = useState('');
    const fileRef = useRef(null);

    async function onPickFile(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        setErr('');
        setUploading(true);
        try {
            const uploaded = await uploadImage(file); // { url, publicId }
            // New photo becomes primary (photos[0]).
            setPhotos((prev) => [{ url: uploaded.url, publicId: uploaded.publicId }, ...prev].slice(0, 6));
        } catch (e2) {
            setErr(e2.message || p.uploadFailed);
        } finally {
            setUploading(false);
        }
    }

    function removePhoto(idx) {
        setPhotos((prev) => prev.filter((_, i) => i !== idx));
    }

    async function save() {
        setErr('');
        setSaving(true);
        try {
            await updateMyProfile({
                displayName: displayName.trim().slice(0, NAME_MAX),
                bio: bio.trim().slice(0, BIO_MAX),
                photos,
            });
            await onSaved();
            onClose();
        } catch (e) {
            setErr(e.message || p.saveFailed);
        } finally {
            setSaving(false);
        }
    }

    const input = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#0b1016]';

    return (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/50 p-4" onClick={onClose}>
            <div
                className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-slate-300 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#131c26] dark:shadow-none"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">{p.edit}</h2>

                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {p.photos}
                </label>
                <div className="mb-3 flex flex-wrap gap-2">
                    {photos.map((ph, i) => (
                        <div key={ph.url || i} className="relative">
                            <div className="h-16 w-16 overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={ph.url} alt="" className="h-full w-full object-cover" />
                            </div>
                            <button
                                type="button"
                                onClick={() => removePhoto(i)}
                                aria-label={p.removePhoto}
                                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-xs font-bold text-white"
                            >
                                ✕
                            </button>
                            {i === 0 ? (
                                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-center text-[9px] font-bold uppercase text-white">
                                    {p.primary}
                                </span>
                            ) : null}
                        </div>
                    ))}
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
                <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading || photos.length >= 6}
                    className="mb-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                    {uploading ? p.uploading : p.addPhoto}
                </button>

                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {p.displayName}
                </label>
                <input
                    className={input}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value.slice(0, NAME_MAX))}
                    maxLength={NAME_MAX}
                />

                <label className="mb-1.5 mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {p.bio}
                </label>
                <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                    rows={4}
                    className={`${input} resize-none`}
                />
                <p className="mt-1 text-right text-xs text-slate-400">{bio.length}/{BIO_MAX}</p>

                {err ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</p> : null}

                <div className="mt-5 flex justify-end gap-3">
                    <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                        {c.cancel}
                    </button>
                    <button
                        onClick={save}
                        disabled={saving || uploading}
                        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:brightness-105 disabled:opacity-50"
                    >
                        {saving ? c.saving : c.save}
                    </button>
                </div>
            </div>
        </div>
    );
}