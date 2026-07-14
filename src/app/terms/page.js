// qup-pulse-admin/src/app/terms/page.js
'use client';

// Terms of Service — reads translated strings via useLang() + getLegal(lang).
// English governs legally. Theme-aware (dark/emerald with light/dark toggle).
// Keeps the Apple-required "Objectionable content" section.

import { useLang } from '../../context/LandingLang';
import { getLegal } from '../../content/legalContent';
import LegalHeader from '../../components/LegalHeader';

const EMAIL = 'jan.egil.staff@qupda.com';

export default function TermsPage() {
  const { lang } = useLang();
  const L = getLegal(lang);
  const t = L.terms;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-200">
      <LegalHeader />
      <div className="mx-auto max-w-[680px] px-6 pb-24 pt-16 text-[17px] leading-[1.7]">
        <h1 className="mb-2 text-[34px] font-bold tracking-tight text-slate-900 dark:text-white">{t.title}</h1>
        <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">{L.updated}</p>

        <P>{t.intro}</P>

        <H2>{t.eligibilityTitle}</H2>
        <P>{t.eligibilityBody}</P>

        <H2>{t.accountTitle}</H2>
        <P>{t.accountBody}</P>

        <H2>{t.contentTitle}</H2>
        <P>{t.contentBody}</P>

        <H2>{t.objectionableTitle}</H2>
        <P>{t.objectionableBody1}</P>
        <P>{t.objectionableBody2}</P>

        <H2>{t.deleteTitle}</H2>
        <P>{t.deleteBody}</P>

        <H2>{t.disclaimerTitle}</H2>
        <P>{t.disclaimerBody}</P>

        <H2>{t.changesTitle}</H2>
        <P>{t.changesBody}</P>

        <H2>{t.contactTitle}</H2>
        <p className="mb-[18px] text-slate-700 dark:text-slate-300">
          {t.contactBody}{' '}
          <A href={`mailto:${EMAIL}`}>{EMAIL}</A>.
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
function Governing({ text, org }) {
  return (
    <>
      <p className="mt-10 text-[15px] text-slate-500 dark:text-slate-400">{text}</p>
      <div className="mt-6 border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-white/12 dark:text-slate-400">{org}</div>
    </>
  );
}
