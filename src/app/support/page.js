// qup-pulse-admin/src/app/support/page.js
'use client';

// Support — reads translated strings via useLang() + getLegal(lang).
// English governs legally. Theme-aware. This is the Apple "Support URL" page.

import { useLang } from '../../context/LandingLang';
import { getLegal } from '../../content/legalContent';
import LegalHeader from '../../components/LegalHeader';

const EMAIL = 'jan.egil.staff@qupda.com';

export default function SupportPage() {
  const { lang } = useLang();
  const L = getLegal(lang);
  const t = L.support;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-200">
      <LegalHeader />
      <div className="mx-auto max-w-[680px] px-6 pb-24 pt-16 text-[17px] leading-[1.7]">
        <h1 className="mb-6 text-[34px] font-bold tracking-tight text-slate-900 dark:text-white">{t.title}</h1>

        <P>{t.intro}</P>
        <p className="mb-[18px] text-lg">
          <A href={`mailto:${EMAIL}`}>{EMAIL}</A>
        </p>

        <H2>{t.faqTitle}</H2>

        <QA q={t.q1}>{t.a1}</QA>
        <QA q={t.q2}>
          {t.a2pre} <A href="/delete">{t.a2link}</A> {t.a2post}
        </QA>
        <QA q={t.q3}>
          {t.a3pre} <A href="/privacy">{t.a3link}</A>{t.a3post}
        </QA>
        <QA q={t.q4}>
          {t.a4pre} <A href="/terms">{t.a4link}</A>{t.a4post}
        </QA>

        <H2>{t.contactTitle}</H2>
        <p className="mb-[18px] text-slate-700 dark:text-slate-300">
          {t.contactPre}{' '}
          <A href={`mailto:${EMAIL}`}>{EMAIL}</A>{' '}
          {t.contactPost}
        </p>

        <Governing text={L.governing} org={L.org} />
      </div>
    </main>
  );
}

function H2({ children }) {
  return <h2 className="mb-3.5 mt-11 text-xl font-bold text-slate-900 dark:text-white">{children}</h2>;
}
function P({ children }) {
  return <p className="mb-[18px] text-slate-700 dark:text-slate-300">{children}</p>;
}
function A({ href, children }) {
  return <a href={href} className="font-semibold text-emerald-600 no-underline dark:text-emerald-400">{children}</a>;
}
function QA({ q, children }) {
  return (
    <div className="mb-5">
      <span className="mb-1 block font-semibold text-slate-900 dark:text-white">{q}</span>
      <span className="text-base text-slate-700 dark:text-slate-300">{children}</span>
    </div>
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
