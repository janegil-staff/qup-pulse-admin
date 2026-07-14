// qup-pulse-admin/src/app/delete/page.js
'use client';

// Delete Account — reads translated strings via useLang() + getLegal(lang).
// English governs legally. Theme-aware. The numbered steps use {b}...{/b}
// bold markers in the translations, rendered here via parseBold().

import { useLang } from '../../context/LandingLang';
import { getLegal, parseBold } from '../../content/legalContent';
import LegalHeader from '../../components/LegalHeader';

const EMAIL = 'jan.egil.staff@qupda.com';

export default function DeletePage() {
  const { lang } = useLang();
  const L = getLegal(lang);
  const t = L.del;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-200">
      <LegalHeader />
      <div className="mx-auto max-w-[680px] px-6 pb-24 pt-16 text-[17px] leading-[1.7]">
        <h1 className="mb-6 text-[34px] font-bold tracking-tight text-slate-900 dark:text-white">{t.title}</h1>

        <P>{t.intro}</P>

        <H2>{t.stepsTitle}</H2>
        <ol className="mb-[18px] list-decimal pl-[22px] text-base text-slate-700 dark:text-slate-300">
          {t.steps.map((step, i) => (
            <li key={i} className="mb-2.5">{renderBold(step)}</li>
          ))}
        </ol>

        <H2>{t.deletedTitle}</H2>
        <ul className="mb-[18px] list-disc pl-[22px] text-base text-slate-700 dark:text-slate-300">
          {t.deleted.map((d, i) => <li key={i} className="mb-2.5">{d}</li>)}
        </ul>

        <P>{t.retentionNote}</P>

        <H2>{t.helpTitle}</H2>
        <p className="mb-[18px] text-slate-700 dark:text-slate-300">
          {t.helpBody}{' '}
          <A href={`mailto:${EMAIL}`}>{EMAIL}</A>{' '}
          {t.helpBodyEnd}
        </p>

        <Governing text={L.governing} org={L.org} />
      </div>
    </main>
  );
}

// Turn a "…{b}bold{/b}…" string into React nodes.
function renderBold(str) {
  return parseBold(str).map((part, i) =>
    typeof part === 'string'
      ? <span key={i}>{part}</span>
      : <strong key={i} className="text-slate-900 dark:text-white">{part.bold}</strong>
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
