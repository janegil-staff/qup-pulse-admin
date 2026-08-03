// qup-pulse-admin/src/app/admin/page.js
"use client";
// Landing page for /admin. The layout supplies the header, submenu and footer;
// this is just the overview that sits inside it.
//
// The card list mirrors the submenu in layout.js. They are two separate arrays
// in two files, so adding a surface to one and not the other leaves it
// reachable from the sidebar but invisible here — which is what happened when
// Deleted messages was added.
import Link from "next/link";
import { useLang } from "../../context/LandingLang";
export default function AdminPage() {
  const { t } = useLang();
  // Fallbacks so the page renders before patchAdminTranslations.cjs has run.
  // Remove them once the keys are in all 12 locales.
  const nav = t.app.nav || {};
  const a = t.app.admin || {};
  const sections = [
    {
      href: "/admin/reports",
      icon: "🚩",
      label: nav.reports,
      description: a.reportsDescription,
    },
    {
      href: "/admin/deleted",
      icon: "🗑️",
      label: a.deletedMessages || "Deleted messages",
      description: a.deletedDescription,
    },
    {
      href: "/admin/removed",
      icon: "👥",
      label: nav.removed || "Removed by moderators",
      description: a.removedDescription,
    },
    {
      href: "/admin/users",
      icon: "👥",
      label: nav.users || "Users",
      description: a.usersDescription,
    },
    {
      href: "/admin/seed",
      icon: "🌱",
      label: nav.seed || "Seed data",
      description: a.seedDescription,
    },
  ];
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        {a.title || nav.admin}
      </h1>
      {a.subtitle ? (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {a.subtitle}
        </p>
      ) : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-2xl border border-slate-300 bg-white p-5 no-underline shadow-sm transition hover:border-emerald-500/60 dark:border-slate-800 dark:bg-[#131c26] dark:shadow-none"
          >
            <span className="text-2xl" aria-hidden="true">
              {section.icon}
            </span>
            <p className="mt-2 text-[15px] font-bold text-slate-900 dark:text-white">
              {section.label}
            </p>
            {section.description ? (
              <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {section.description}
              </p>
            ) : null}
          </Link>
        ))}
      </div>
    </>
  );
}
