// localpulse-admin/app/AdminShell.js
'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { clearToken } from '../lib/api.js';

// Shared chrome for the authed admin pages. Top tab bar (Reports / Users) plus
// sign-out. Kept as a component the pages import, rather than a route-group
// layout, so each page stays a self-contained client component that guards its
// own auth.
export default function AdminShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  function signOut() {
    clearToken();
    router.replace('/login');
  }

  const tabs = [
    { href: '/reports', label: 'Reports' },
    { href: '/users', label: 'Users' },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <h1 className="text-lg font-semibold tracking-tight">Qup Pulse</h1>
        </div>
        <button onClick={signOut} className="text-xs text-slate-400 transition hover:text-slate-200">
          Sign out
        </button>
      </header>

      <nav className="mb-5 flex gap-1 rounded-lg border border-slate-800 bg-slate-900/50 p-1">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition ${
                active ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
