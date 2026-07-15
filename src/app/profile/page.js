// qup-pulse-admin/src/app/profile/page.js
'use client';

// Own profile — view + edit (photo, display name, bio).
// LOGGED-IN ONLY (redirects to / without a token). Localized via useLang().
//
// API:  GET   /me                  -> { profile: toSelf() }
//       PATCH /me                  { displayName, bio, photos }
//       POST  /upload  (multipart) -> { url, publicId }
//
// Photos are replace-in-full on PATCH: the server destroys any photo dropped
// from the array, so the edit modal always sends the whole list.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, isAdmin } from '../../lib/api';
import { useLang } from '../../context/LandingLang';
import AppNav from '../../components/AppNav';
import { getMyProfile, updateMyProfile, uploadImage } from '../../lib/profileSettingsApi';
import Link from 'next/link';

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

    const reload = async () => setProfile(await getMyProfile());

    useEffect(() => {
        if (!getToken()) { router.replace('/'); return; }
        reload()
            .then(() => setReady(true))
            .catch((e) => { setError(e.message || p.loadFailed); setReady(true); });
    }, [router]);

    if (!ready) {
        return (
            <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-500 dark:bg-[#0b1016] dark:text-slate-400">
                {s.loading}
            </div>
        );
    }
    const avatar = profile?.photos?.[0]?.url || '';
    const name = profile?.displayName || profile?.username || '—';

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
                            <h2 className="truncate text-xl font-bold text-slate-900 dark:text-white">{name}</h2>
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

                            {isAdmin() ? (
                                <Link
                                    href="/reports"
                                    className="w-full rounded-lg border border-slate-300 px-3.5 py-1.5 text-center text-sm font-semibold text-slate-600 no-underline transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    {t.app.nav.reports}
                                </Link>
                            ) : null}
                        </div>
                    </div>

                    {profile?.bio ? (
                        <p className="mt-5 whitespace-pre-wrap text-[15px] text-slate-700 dark:text-slate-300">{profile.bio}</p>
                    ) : (
                        <p className="mt-5 text-[15px] text-slate-400 dark:text-slate-600">{p.noBio}</p>
                    )}
                </div>
            </main>

            {editing && (
                <EditModal
                    profile={profile}
                    onClose={() => setEditing(false)}
                    onSaved={reload}
                />
            )}
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