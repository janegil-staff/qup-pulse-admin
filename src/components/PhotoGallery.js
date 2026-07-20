// qup-pulse-admin/src/components/PhotoGallery.js
'use client';

// Read-only photo gallery shown on both the own-profile and public-profile
// pages. Renders every photo the user has (not just the avatar) as a responsive
// grid of thumbnails; clicking one opens a full-size lightbox. Photos are the
// shared { url, publicId } shape used across the app.
//
// Renders nothing when there are no photos, so callers can drop it in
// unconditionally.

import { useEffect, useState } from 'react';

export default function PhotoGallery({ photos, label }) {
    const list = Array.isArray(photos) ? photos.filter((ph) => ph && ph.url) : [];
    const [active, setActive] = useState(null); // index of lightbox photo, or null

    // Close the lightbox on Escape.
    useEffect(() => {
        if (active === null) return;
        function onKey(e) {
            if (e.key === 'Escape') setActive(null);
            if (e.key === 'ArrowRight') setActive((i) => (i === null ? i : (i + 1) % list.length));
            if (e.key === 'ArrowLeft') setActive((i) => (i === null ? i : (i - 1 + list.length) % list.length));
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [active, list.length]);

    if (list.length === 0) return null;

    return (
        <div className="mb-4 rounded-2xl border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#131c26] dark:shadow-none">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {label}
            </h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {list.map((ph, i) => (
                    <button
                        key={ph.url || i}
                        type="button"
                        onClick={() => setActive(i)}
                        className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={ph.url}
                            alt=""
                            className="h-full w-full object-cover transition group-hover:brightness-110"
                        />
                    </button>
                ))}
            </div>

            {active !== null ? (
                <div
                    className="fixed inset-0 z-40 grid place-items-center bg-black/80 p-4"
                    onClick={() => setActive(null)}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={list[active].url}
                        alt=""
                        className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        type="button"
                        onClick={() => setActive(null)}
                        aria-label="Close"
                        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-2xl font-light text-white transition hover:bg-white/25"
                    >
                        ×
                    </button>
                    {list.length > 1 ? (
                        <>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setActive((i) => (i - 1 + list.length) % list.length); }}
                                aria-label="Previous"
                                className="absolute left-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-2xl text-white transition hover:bg-white/25"
                            >
                                ‹
                            </button>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setActive((i) => (i + 1) % list.length); }}
                                aria-label="Next"
                                className="absolute right-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-2xl text-white transition hover:bg-white/25"
                            >
                                ›
                            </button>
                        </>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}