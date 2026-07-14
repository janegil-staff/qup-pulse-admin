// qup-pulse-admin/src/app/child-safety/page.js
'use client';

// Child Safety Standards — reads translated strings via useLang() + getLegal(lang).
// English governs legally. Theme-aware. Required for Google Play CSAE declaration.

import { useLang } from '../../context/LandingLang';
import { getLegal } from '../../content/legalContent';
import LegalHeader from '../../components/LegalHeader';

const EMAIL = 'jan.egil.staff@qupda.com';

export default function ChildSafetyPage() {
  const { lang } = useLang();
  const L = getLegal(lang);
  const t = L.child;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-200">
      <LegalHeader />
      <div className="mx-auto max-w-[760px] px-6 pb-20 pt-12 leading-relaxed">
        <h1 className="mb-1.5 text-3xl font-bold text-slate-900 dark:text-white">{t.title}</h1>
        <p className="mb-8 text-[15px] text-slate-500 dark:text-slate-400">{L.updated}</p>

        <div className="mb-7 rounded-xl border border-red-300 border-l-4 border-l-red-500 bg-red-50 p-4 dark:border-red-500/40 dark:border-l-red-500 dark:bg-red-500/10">
          <p className="font-semibold text-slate-900 dark:text-white">{t.banner}</p>
        </div>

        <P>{t.intro}</P>

        <H2>{t.ageTitle}</H2>
        <P>{t.ageBody}</P>

        <H2>{t.prohibitedTitle}</H2>
        <P>{t.prohibitedIntro}</P>
        <Ul items={t.prohibited} />

        <H2>{t.preventTitle}</H2>
        <Ul items={t.prevent} />

        <H2>{t.reportTitle}</H2>
        <P>{t.reportBody1}</P>
        <p className="mb-3.5 text-slate-700 dark:text-slate-300">
          {t.reportBody2pre}{' '}
          <A href={`mailto:${EMAIL}`}>{EMAIL}</A>.{' '}
          {t.reportBody2post}
        </p>
        <P>{t.reportBody3}</P>

        <H2>{t.respondTitle}</H2>
        <P>{t.respondBody}</P>

        <H2>{t.contactTitle}</H2>
        <p className="mb-3.5 text-slate-700 dark:text-slate-300">
          {t.contactBody}{' '}
          <A href={`mailto:${EMAIL}`}>{EMAIL}</A>.
        </p>

        <Governing text={L.governing} org={L.org} />
      </div>
    </main>
  );
}

function H2({ children }) {
  return <h2 className="mb-2.5 mt-8 text-xl font-bold text-slate-900 dark:text-white">{children}</h2>;
}
function P({ children }) {
  return <p className="mb-3.5 text-slate-700 dark:text-slate-300">{children}</p>;
}
function A({ href, children }) {
  return <a href={href} className="font-semibold text-emerald-600 no-underline dark:text-emerald-400">{children}</a>;
}
function Ul({ items }) {
  return (
    <ul className="mb-3.5 list-disc pl-6 text-slate-700 dark:text-slate-300">
      {items.map((it, i) => <li key={i} className="mb-1">{it}</li>)}
    </ul>
  );
}
function Governing({ text, org }) {
  return (
    <>
      <p className="mt-10 text-[15px] text-slate-500 dark:text-slate-400">{text}</p>
      <div className="mt-6 border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-white/12 dark:text-slate-400">{org}</div>
    </>
  );
}
