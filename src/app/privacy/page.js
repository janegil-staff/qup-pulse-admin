// qup-pulse-admin/src/app/privacy/page.js
"use client";

// Privacy Policy — reads translated strings via useLang() + getLegal(lang).
// English governs legally; other languages are courtesy translations.
// Theme-aware (dark/emerald with the site's light/dark toggle).
//
// MODERATION SECTION added because the app now does four things the previous
// version of this policy did not describe, and each one is a processing
// activity a reader would want to know about:
//
//   1. Retraction does not delete. The confirm dialog in the app already tells
//      the sender that moderators keep a copy — so the policy has to say the
//      same thing, or the product promises one thing and the document another.
//   2. Moderators can read private messages on four surfaces, two of which are
//      not anchored to a report.
//   3. There is a moderator role distinct from administrator.
//   4. A report stores a snapshot of the message text that survives both
//      retraction and removal.
//
// Every string has an English fallback so the page renders correctly before
// the locale files carry these keys. The fallbacks are the authoritative
// wording: English governs, per the note at the foot of the page.
//
// RETENTION is the part that needs a decision rather than wording. Nothing
// currently deletes retracted messages or resolved reports, so the honest
// answer today is "indefinitely" — which is hard to defend under GDPR for
// content a user actively withdrew. The retention section says what is true
// now; if a purge job lands later, this is the text to revisit first.
//
// NOT LEGAL ADVICE. This describes what the code does, accurately. Whether
// that description satisfies GDPR, the App Store review guidelines or Google
// Play's user-data policy is a question for someone qualified to answer it.

import { useLang } from "../../context/LandingLang";
import { getLegal } from "../../content/legalContent";
import LegalHeader from "../../components/LegalHeader";

const EMAIL = "jan.egil.staff@qupda.com";

export default function PrivacyPage() {
  const { lang } = useLang();
  const L = getLegal(lang);
  const t = L.privacy;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-200">
      <LegalHeader />
      <div className="mx-auto max-w-[680px] px-6 pb-24 pt-16 text-[17px] leading-[1.7]">
        <h1 className="mb-2 text-[34px] font-bold tracking-tight text-slate-900 dark:text-white">
          {t.title}
        </h1>
        <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
          {L.updated}
        </p>

        <P>{t.intro}</P>
        <P>{t.ageNote}</P>

        <H2>{t.collectTitle}</H2>
        <Ul items={t.collect} />

        <H2>{t.useTitle}</H2>
        <Ul items={t.use} />

        {/* ── Messages ──────────────────────────────────────────────────
            Placed before moderation because it explains the mechanics the
            moderation section then refers to. A reader who does not
            understand that hiding and retracting are different will not
            follow why moderators can still see one of them. */}
        <H2>{t.messagesTitle || "Your messages"}</H2>
        <P>
          {t.messagesIntro ||
            "Private messages are stored so they can be delivered and read. Three different things can happen to a message, and they are not the same:"}
        </P>
        <Ul
          items={
            t.messages || [
              "Hide — you remove a message from your own view. The other person keeps their copy and is not told. The message is not changed or deleted.",
              "Retract — you withdraw your own message and it disappears for both of you. This cannot be undone. The text is not erased from our servers: we keep it so that reports about it can still be handled.",
              "Removal by us — a moderator takes a message down. Neither participant sees it afterwards. This can be reversed by us.",
            ]
          }
        />
        <P>
          {t.messagesRetractNote ||
            "We say this plainly because the app says it too: retracting a message hides it from everyone in the app, but does not erase it from our servers."}
        </P>

        {/* ── Moderation ────────────────────────────────────────────── */}
        <H2>{t.moderationTitle || "Moderation and staff access"}</H2>
        <P>
          {t.moderationIntro ||
            "To keep the service safe we operate a moderation team. Staff accounts have one of two roles: moderators, who can act on content, and administrators, who can additionally manage accounts. Both can read private messages in the situations listed below."}
        </P>
        <Ul
          items={
            t.moderation || [
              "When someone files a report, moderators can read the reported message and the conversation around it. A single line is rarely enough to judge a complaint fairly.",
              "A report stores a copy of the message text as it was when the report was made. That copy is kept even if the message is later retracted or removed.",
              "Moderators can see messages that participants have hidden, that senders have retracted, or that our team has removed. Reading these is not limited to messages someone has reported.",
              "Administrators can additionally see account details, including email addresses, and can suspend accounts.",
            ]
          }
        />
        <P>
          {t.moderationNote ||
            "Staff access to private messages is a real intrusion and we treat it as one. These tools exist so that complaints can be answered and abuse can be acted on — not for browsing."}
        </P>

        <H2>{t.rightsTitle}</H2>
        <P>{t.rightsBody}</P>

        <H2>{t.retentionTitle}</H2>
        <P>{t.retentionBody}</P>
        <P>
          {t.retentionMessages ||
            "Messages you hide or retract, and messages our moderators remove, are kept in our database rather than erased, so that reports and appeals about them remain answerable. Reports are kept after they are resolved so that repeated behaviour can be recognised."}
        </P>
        <P>
          {t.retentionDeletion ||
            "If you delete your account, ask us and we will remove your messages along with it, except where we are required to keep something to deal with an open report or a legal obligation."}
        </P>

        <H2>{t.contactTitle}</H2>
        <p className="mb-[18px] text-slate-700 dark:text-slate-300">
          {t.contactBody} <A href={`mailto:${EMAIL}`}>{EMAIL}</A>.
        </p>

        <Governing text={L.governing} org={L.org} />
      </div>
    </main>
  );
}

function H2({ children }) {
  return (
    <h2 className="mb-3.5 mt-11 text-xl font-bold text-slate-900 dark:text-white">
      {children}
    </h2>
  );
}
function P({ children }) {
  return (
    <p className="mb-[18px] text-slate-700 dark:text-slate-300">{children}</p>
  );
}
function A({ href, children }) {
  return (
    <a
      href={href}
      className="font-semibold text-emerald-600 no-underline dark:text-emerald-400"
    >
      {children}
    </a>
  );
}
function Ul({ items }) {
  return (
    <ul className="mb-[18px] list-disc pl-[22px] text-base text-slate-700 dark:text-slate-300">
      {(items || []).map((it, i) => (
        <li key={i} className="mb-2">
          {it}
        </li>
      ))}
    </ul>
  );
}
function Governing({ text, org }) {
  return (
    <>
      <p className="mt-10 text-[15px] text-slate-500 dark:text-slate-400">
        {text}
      </p>
      <div className="mt-6 border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-white/12 dark:text-slate-400">
        {org}
      </div>
    </>
  );
}
