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
// LOCATION SECTION added, and the collect/use lists moved to new keys, because
// the app's location model changed and the old wording is now false. It said
// location was used "to show you nearby posts" and that "you can control this
// through your device settings". Both are wrong today:
//
//   - Location is also used to show the user TO other members, which the old
//     text never mentioned at all. That is the disclosure App Store guideline
//     5.1.2(i) is about, and its absence is what the app's rejection turned on.
//   - Control no longer lives in device settings. There is a separate in-app
//     agreement, and visibility additionally requires a manual check-in that
//     expires on its own and cannot be automated.
//
// Why NEW KEYS (collectV2, useV2) rather than editing `collect` and `use`:
// eleven translations already carry the old strings. Editing only the English
// would leave those eleven silently asserting a claim that is no longer true,
// in the exact place a regulator or a reviewer would look. A new key falls
// back to correct English everywhere until each translation lands, which is
// the right failure mode. Delete the old keys once the translations exist.
//
// Every string has an English fallback so the page renders correctly before
// the locale files carry these keys. The fallbacks are the authoritative
// wording: English governs, per the note at the foot of the page.
//
// KEYS THE LOCALE FILES STILL NEED (English falls back until they land):
//   collectV2, useV2, locationTitle, locationIntro, locationSeeing,
//   locationBeingSeen, locationCheckIn, locationRounding, locationWithdraw,
//   locationNote, visibilityTitle, visibilityProfile, visibilityDistance,
//   visibilityBlocking, visibilitySharing
//
// BUMP `L.updated` when this deploys. A policy whose date predates the change
// it describes invites the reader to assume the change is not described.
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
        <Ul
          items={
            t.collectV2 || [
              "Account information: your email address and PIN.",
              "Profile information: your username, display name, and profile photo.",
              "Content you create: posts, comments, messages, and images you share.",
              "Approximate location. How we use it, and what you control, is described under Location below.",
            ]
          }
        />

        <H2>{t.useTitle}</H2>
        <Ul
          items={
            t.useV2 || [
              "To provide and operate the app, including your feed, messages, and profile.",
              "To show you relevant nearby content.",
              "To show you to other members, but only with your agreement and only while you are checked in. See Location below.",
              "To keep the service safe, including handling reports and moderation.",
              "To send you service-related emails, such as verification and password reset.",
            ]
          }
        />

        {/* ── Location ──────────────────────────────────────────────────
            Placed immediately after the two lists that refer to it, and
            before messages/moderation, because this is the section a reader
            arriving from the app's consent dialog came to find.

            Seeing and being seen are separate paragraphs rather than one
            because they are governed by separate controls. A reader who
            takes them as a single thing will misunderstand what they
            agreed to, which is the misunderstanding this whole section
            exists to prevent. */}
        <H2>{t.locationTitle || "Location"}</H2>
        <P>
          {t.locationIntro ||
            "We use your approximate location for two separate things, and you control them separately."}
        </P>
        <P>
          {t.locationSeeing ||
            "To show you nearby posts and people. This uses your position on your device, and needs the location permission your phone asks for. You can refuse it, or withdraw it later in your device settings; the app still works, and your feed is simply not ranked by distance."}
        </P>
        <P>
          {t.locationBeingSeen ||
            "To show you to other members. This needs something more than the phone permission: it needs your agreement inside the app, which we ask you for directly and which you can decline."}
        </P>
        <P>
          {t.locationCheckIn ||
            "Agreeing does not by itself make you visible to anyone. You become visible only when you check in, which is a deliberate action you take each time. A check-in lasts for a limited period and then lapses on its own. Check-ins cannot be made automatic — there is no setting for it anywhere in the app — and we never record your position in the background, or while you are not using the app."}
        </P>
        <P>
          {t.locationRounding ||
            "Your coordinates are rounded before they are stored, so we hold an approximate position rather than an exact one. Other members are never shown your position on a map, a pin, or an address. They see only a rounded distance, such as “~4 km”."}
        </P>
        <P>
          {t.locationWithdraw ||
            "You can check out at any time, which removes you from other members’ results immediately. You can also withdraw your agreement entirely under Settings, Privacy and safety: that ends any active check-in and deletes the position we hold for you. Declining, checking out, or withdrawing does not stop you browsing, posting, messaging, or calling."}
        </P>
        <P>
          {t.locationNote ||
            "We say this plainly because the app works this way too: being able to see people near you and being seen by them are different things, and you are asked about them separately."}
        </P>

        {/* ── Visibility ────────────────────────────────────────────────
            The previous version never stated that the profile is visible to
            other members at all — an odd gap in a social app's document, and
            not something a reader should have to infer. Blocking sits here
            rather than under moderation because it is a control the reader
            has, not an action we take. */}
        <H2>{t.visibilityTitle || "What other members can see"}</H2>
        <P>
          {t.visibilityProfile ||
            "Your profile — your username, display name, photo, and what you post — is visible to other members of the app."}
        </P>
        <P>
          {t.visibilityDistance ||
            "Your approximate distance is shown to other members only while you are checked in, as described above. When you are not checked in, you do not appear in other members’ results at all."}
        </P>
        <P>
          {t.visibilityBlocking ||
            "You can block any member from their profile, which removes them from your results and prevents them contacting you. Members you have blocked are listed under Settings, Privacy and safety, where you can unblock them."}
        </P>
        <P>
          {t.visibilitySharing ||
            "We share data with service providers, such as image hosting, only as needed to operate the service. We do not sell your personal data."}
        </P>

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
