// qup-pulse-admin/src/app/admin/layout.js
"use client";

// Shell for every /admin/* page: the normal app header and footer, plus a
// submenu for the admin surfaces.
//
// The redirect below is a UI convenience, not a security boundary. isAdmin()
// reads localStorage, which the user controls — every /admin/* API route
// re-checks role server-side via requireAdmin. Faking the flag here gets you an
// empty dashboard and a row of 403s, nothing more.

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getToken, isAdmin } from "../../lib/api";
import { useLang } from "../../context/LandingLang";
import AppNav from "../../components/AppNav";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLang();
  const s = t.app.settings;

  // null = still checking. localStorage is client-only, so reading it during
  // render would mismatch the server-rendered HTML and hydrate wrong.
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    if (!getToken() || !isAdmin()) {
      router.replace("/");
      return;
    }
    setAllowed(true);
  }, [router]);

  if (allowed !== true) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-500 dark:bg-[#0b1016] dark:text-slate-400">
        {s.loading}
      </div>
    );
  }

  const items = [
    { href: "/admin/reports", label: t.app.nav.reports, icon: "🚩" },
    { href: "/admin/users", label: t.app.nav.users, icon: "👥" },
    { href: "/admin/seed", label: t.app.nav.seed, icon: "🌱" },
  ];

  // Exact match, or a nested route beneath it (/admin/users/123).
  const isActive = (href) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-100">
      <AppNav />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8 md:flex-row">
        {/* Submenu. Sidebar on desktop, a scrollable tab strip on mobile —
            a stacked vertical menu would push the actual content below the
            fold on a phone. */}
        <nav className="shrink-0 md:w-56">
          <p className="mb-3 hidden text-xs font-semibold uppercase tracking-wide text-slate-400 md:block dark:text-slate-500">
            {t.app.admin.title}
          </p>

          <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-col md:overflow-visible md:px-0 md:pb-0">
            {items.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href} className="shrink-0 md:shrink">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold no-underline transition md:w-full " +
                      (active
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        : "text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800")
                    }
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Swap this for whatever the rest of the app uses — profile/page.js
          renders no footer, so I could not confirm the component name. */}
      {/* <AppFooter /> */}
    </div>
  );
}
