// qup-pulse-admin/src/components/AppNav.js
'use client';

// Top navigation for the logged-in app pages: Discover / Feed / Messages /
// Profile / Settings, plus Reports for admins, and a dark/light toggle.
// Desktop: inline tabs + toggle on the right. Mobile: hamburger dropdown with
// the toggle at the bottom.
//
// Fully localized via useLang() (t.app.nav.*). The wordmark stays literal — it's
// the brand, not copy. Tabs carry a labelKey rather than a label so the array
// can stay module-level while the text resolves per render.
//
// The current username shows next to Log out. It's here for the same reason a
// terminal prompt shows the host: with several accounts open across windows,
// "which user is this tab?" is otherwise unanswerable without decoding the JWT.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { isAdmin, clearToken, getToken, getUsername } from '../lib/api';
import { useDarkMode } from '../lib/useDarkMode';
import { useLang } from '../context/LandingLang';
import { getSocket } from '../lib/socket';
import { chatUnreadCount } from '../lib/chatApi';

const TABS = [
    { href: '/discover', labelKey: 'discover', enabled: true },
    { href: '/feed', labelKey: 'feed', enabled: true },
    { href: '/messages', labelKey: 'messages', enabled: true, badge: 'unread' },
    { href: '/profile', labelKey: 'profile', enabled: true },
    { href: '/settings', labelKey: 'settings', enabled: true },
];

export default function AppNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { t } = useLang();
    const n = t.app.nav;
    const m = t.app.messages;
    const [open, setOpen] = useState(false);
    const [admin, setAdmin] = useState(false);
    const [me, setMe] = useState('');
    const { dark, toggle } = useDarkMode();

    // COMBINED_UNREAD_NAV_V1 — the badge counts inbox unreads AND incoming
    // message requests as one number. /messages shows Inbox and Requests as
    // sibling tabs, so a single count resolves either way; splitting them into
    // two indicators would need requestCount, which chatUnreadCount() already
    // returns.
    //
    // Unread badge on the Messages tab. Fed by chat:notify, which deliver()
    // emits to `user:${id}` for every participant who isn't the sender — so it
    // fires regardless of which tab you're on, unlike chat:message, which only
    // reaches sockets that have joined a convo: room.
    //
    // Refetch rather than increment: markRead fires from the thread page and a
    // locally-incremented count would go stale against it.
    //
    // The catches LOG. A bare `.catch(() => {})` here previously hid a
    // ReferenceError for hours — the badge just sat at zero with a clean
    // console. A failing badge is not worth a crash, but it is worth a line.
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        if (!getToken()) return;
        let cancelled = false;

        const refresh = () => {
            chatUnreadCount()
                .then(({ count }) => { if (!cancelled) setUnread(count); })
                .catch((e) => console.error('unread badge', e));
        };

        refresh();

        const socket = getSocket();
        socket?.on('chat:notify', refresh);

        // markRead happens in messages/[id]/page.js, which has no handle on this
        // component. It dispatches this event after the receipt lands so the
        // badge clears without waiting for the next notify or navigation.
        window.addEventListener('chat:read', refresh);

        return () => {
            cancelled = true;
            socket?.off('chat:notify', refresh);
            window.removeEventListener('chat:read', refresh);
        };
    }, []);

    // Route changes are the other moment the count goes stale — navigating away
    // from a thread we just read, or landing on the app from a cold start before
    // the socket has connected.
    useEffect(() => {
        if (!getToken()) return;
        chatUnreadCount()
            .then(({ count }) => setUnread(count))
            .catch((e) => console.error('unread badge', e));
    }, [pathname]);

    // Both read localStorage, which is client-only — reading during render would
    // mismatch the server-rendered HTML and hydrate wrong.
    useEffect(() => {
        setAdmin(isAdmin());
        setMe(getUsername() || '');
    }, []);

    function logOut() {
        clearToken();
        setOpen(false);
        router.replace('/');
    }

    const tabs = TABS;
    const isActive = (href) => pathname === href || pathname?.startsWith(`${href}/`);
    const badgeFor = (tab) => (tab.badge === 'unread' ? unread : 0);

    return (
        <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-[#0b1016]/90">
            <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-2.5">
                {/* Wordmark + current user. The name sits here rather than by Log out so it
    reads as "you are here, as this account" — and it's the first thing visible
    when scanning several windows to find the right session. */}
                <div className="flex min-w-0 items-center gap-3">
                    <Link
                        href="/discover"
                        onClick={() => setOpen(false)}
                        className="flex shrink-0 items-center gap-2.5 text-lg font-bold tracking-tight no-underline text-slate-900 dark:text-white"
                    >
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Qup Pulse
                    </Link>
                    {me ? (
                        <span
                            title={me}
                            className="max-w-[14ch] truncate border-l border-slate-300 pl-3 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400"
                        >
                            {me}
                        </span>
                    ) : null}
                </div>
                {/* Desktop tabs + toggle */}

                <div className="hidden items-center gap-1 sm:flex">
                    {tabs.map((tab) => (
                        <TabLink
                            key={tab.href}
                            tab={tab}
                            n={n}
                            m={m}
                            active={isActive(tab.href)}
                            unread={badgeFor(tab)}
                        />
                    ))}
                    <ThemeToggle dark={dark} onToggle={toggle} n={n} className="ml-2" />
                    {/* Truncated: a long display name would push Log out off the row.
              The title attribute carries the full string on hover. */}
       
                    <button
                        onClick={logOut}
                        className="ml-1 rounded-lg border border-slate-300 px-3.5 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        {n.logOut}
                    </button>
                </div>

                {/* Mobile hamburger. The badge is mirrored onto the closed hamburger —
            otherwise an unread count is invisible on mobile until the menu is
            opened, which is most of the time. */}
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-label={n.menu}
                    aria-expanded={open}
                    className="relative grid h-9 w-9 place-items-center rounded-lg border border-slate-300 sm:hidden dark:border-slate-700"
                >
                    <span className="text-lg leading-none">{open ? '✕' : '☰'}</span>
                    {!open && unread > 0 ? <UnreadBadge count={unread} m={m} /> : null}
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
                            m={m}
                            active={isActive(tab.href)}
                            unread={badgeFor(tab)}
                            block
                            onNavigate={() => setOpen(false)}
                        />
                    ))}
                    <div className="mt-1 border-t border-slate-200 pt-2 dark:border-slate-800">
                        {me ? (
                            <p className="truncate px-3.5 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                                {me}
                            </p>
                        ) : null}
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

// The digits carry no language, but a screen reader announcing a bare "3" next
// to "Meldinger" is meaningless — hence the localized aria-label. Capped at 99+
// so a long-dormant account can't stretch the nav.
function UnreadBadge({ count, m }) {
    const label = (m?.unreadCount || '{count}').replace('{count}', String(count));
    return (
        <span
            aria-label={label}
            className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
        >
            {count > 99 ? '99+' : count}
        </span>
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

function TabLink({ tab, n, m, active, block, unread = 0, onNavigate }) {
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
            // `relative` anchors the badge; without it the absolute positioning
            // escapes to the nav and lands in the wrong corner entirely.
            className={`${base} relative flex items-center gap-2 border ${active
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
            {unread > 0 ? <UnreadBadge count={unread} m={m} /> : null}
        </Link>
    );
}