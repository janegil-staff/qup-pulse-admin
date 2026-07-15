// qup-pulse-admin/src/components/AppNav.js
'use client';

// Top navigation for the logged-in app pages: Discover / Feed / Messages /
// Profile / Settings, plus Reports for admins, and a dark/light toggle.
// Desktop: inline tabs + toggle on the right. Mobile: hamburger dropdown with
// the toggle at the bottom.
//
// Discover, Profile and Settings are live. Feed and Messages show "Soon" until
// their pages exist. Reports shows only for admins (UX gate — the server still
// enforces requireAdmin).
//
// Fully localized via useLang() (t.app.nav.*). The wordmark stays literal — it's
// the brand, not copy. Tabs carry a labelKey rather than a label so the array
// can stay module-level while the text resolves per render.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { isAdmin, clearToken } from '../lib/api';
import { useDarkMode } from '../lib/useDarkMode';
import { useLang } from '../context/LandingLang';
import { getToken } from '../lib/api';
import { getSocket } from '../lib/socket';
import { getUnreadCount } from '../lib/chatApi';

const TABS = [
    { href: '/discover', labelKey: 'discover', enabled: true },
    { href: '/feed', labelKey: 'feed', enabled: true },
    { href: '/messages', labelKey: 'messages', enabled: true },
    { href: '/profile', labelKey: 'profile', enabled: true },
    { href: '/settings', labelKey: 'settings', enabled: true },
];

export default function AppNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { t } = useLang();
    const n = t.app.nav;
    const [open, setOpen] = useState(false);
    const [admin, setAdmin] = useState(false);
    const { dark, toggle } = useDarkMode();
    // Unread badge on the Meldinger tab. Fed by chat:notify, which deliver()
    // emits to `user:${id}` for every participant who isn't the sender — so it
    // fires regardless of which tab you're on, unlike chat:message, which only
    // reaches sockets that have joined a convo: room.
    //
    // The notify payload carries `pending`, so a pending thread the RECIPIENT
    // hasn't accepted routes to the Requests count instead. The initiator's own
    // sends never reach them (deliver filters the sender out), so their outgoing
    // request can't inflate their own badge.
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        if (!getToken()) return;
        let cancelled = false;

        const refresh = () => {
            getUnreadCount()
                .then((n) => { if (!cancelled) setUnread(n); })
                .catch(() => { });
        };

        refresh();

        const socket = getSocket();
        socket?.on('chat:notify', refresh);
        return () => {
            cancelled = true;
            socket?.off('chat:notify', refresh);
        };
    }, []);

    useEffect(() => {
        setAdmin(isAdmin());
    }, []);

    function logOut() {
        clearToken();
        setOpen(false);
        router.replace('/');
    }

    const tabs = TABS;
    const isActive = (href) => pathname === href || pathname?.startsWith(`${href}/`);

    return (
        <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-[#0b1016]/90">
            <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-2.5">
                <Link
                    href="/discover"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 text-lg font-bold tracking-tight no-underline text-slate-900 dark:text-white"
                >
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Qup Pulse
                </Link>

                {/* Desktop tabs + toggle */}
                <div className="hidden items-center gap-1 sm:flex">
                    {tabs.map((tab) => (
                        <TabLink key={tab.href} tab={tab} n={n} active={isActive(tab.href)} />
                    ))}
                    <ThemeToggle dark={dark} onToggle={toggle} n={n} className="ml-2" />
                    <button
                        onClick={logOut}
                        className="ml-1 rounded-lg border border-slate-300 px-3.5 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        {n.logOut}
                    </button>
                </div>

                {/* Mobile hamburger */}
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-label={n.menu}
                    aria-expanded={open}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 sm:hidden dark:border-slate-700"
                >
                    <span className="text-lg leading-none">{open ? '✕' : '☰'}</span>
                </button>
            </div>

            {/* Mobile dropdown */}
            {open ? (
                <div className="border-t border-slate-200 px-4 py-2 sm:hidden dark:border-slate-800">
                    {tabs.map((tab) => (
                        <TabLink
                            key={tab.href}
                            tab={tab}
                            n={n}
                            active={isActive(tab.href)}
                            block
                            onNavigate={() => setOpen(false)}
                        />
                    ))}
                    {/* Toggle at the bottom of the dropdown */}
                    <div className="mt-1 border-t border-slate-200 pt-2 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={toggle}
                            className="flex w-full items-center justify-between rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            <span>{dark ? n.darkMode : n.lightMode}</span>
                            <span className="text-base">{dark ? '🌙' : '☀️'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={logOut}
                            className="mt-2 flex w-full items-center rounded-lg border border-red-300 px-3.5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
                        >
                            {n.logOut}
                        </button>
                    </div>
                </div>
            ) : null}
        </nav>
    );
}

function ThemeToggle({ dark, onToggle, n, className = '' }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-label={dark ? n.switchToLight : n.switchToDark}
            className={`grid h-9 w-9 place-items-center rounded-lg border border-slate-300 text-base transition hover:border-emerald-400 dark:border-slate-700 ${className}`}
        >
            {dark ? '🌙' : '☀️'}
        </button>
    );
}

function TabLink({ tab, n, active, block, onNavigate }) {
    const base = block
        ? 'block w-full rounded-lg px-3.5 py-2.5 mb-1.5 text-sm font-semibold no-underline transition'
        : 'rounded-lg px-3.5 py-1.5 text-sm font-semibold no-underline transition';

    const label = n[tab.labelKey];

    if (!tab.enabled) {
        return (
            <span
                className={`${base} flex items-center justify-between gap-2 cursor-default border border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-600`}
                aria-disabled="true"
            >
                {label}
                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {n.soon}
                </span>
            </span>
        );
    }

    return (
        <Link
            href={tab.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`${base} flex items-center gap-2 border ${active
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
        >
            {label}
            {tab.admin ? (
                <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-950">
                    {n.admin}
                </span>
            ) : null}
        </Link>
    );
}