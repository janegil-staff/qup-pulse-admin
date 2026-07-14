// quppulse/app/child-safety/page.js
//
// Child Safety Standards for Qup Pulse.
// Public, unauthenticated page. Required for the Google Play CSAE
// (Child Sexual Abuse and Exploitation) policy declaration, and supports
// Apple App Review Guideline 1.2 for user-generated-content apps.
//
// Review-ready English draft — NOT legal advice. Have counsel confirm the
// reporting-obligation wording for your jurisdictions (NCMEC in the US,
// Kripos/the Norwegian police and any EU obligations) before publishing.
//
// Plain ASCII only (no special characters) to avoid build encoding failures.
//
// Dark theme — colors chosen to sit on the site's dark navy background.
//
// Fill / confirm before publishing:
//   [CONTACT_EMAIL]     - child-safety contact address (e.g. jan.egil@qupda.com)
//   [LAST_UPDATED]      - date this standard last changed
// Confirm the in-app reporting steps match the app's actual menu labels.

export const metadata = {
  title: 'Child Safety Standards - Qup Pulse',
  description:
    'Qup Pulse has zero tolerance for child sexual abuse and exploitation. How we prevent, detect, and report it.',
};

const wrap = {
  maxWidth: 760,
  margin: '0 auto',
  padding: '48px 24px 80px',
  fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  color: '#dbe4ee',
  lineHeight: 1.6,
};
const h1 = { fontSize: 30, fontWeight: 700, marginBottom: 6, color: '#f1f5fa' };
const sub = { color: '#8ea0b2', fontSize: 15, marginBottom: 32 };
const h2 = { fontSize: 20, fontWeight: 700, margin: '32px 0 10px', color: '#f1f5fa' };
const p = { margin: '0 0 14px' };
const link = { color: '#6db3ff' };
const listStyle = { margin: '0 0 14px', paddingLeft: 22 };
const callout = {
  background: 'rgba(214, 69, 69, 0.12)',
  border: '1px solid rgba(214, 69, 69, 0.4)',
  borderLeft: '4px solid #e05555',
  borderRadius: 8,
  padding: '16px 18px',
  margin: '0 0 28px',
};

export default function ChildSafetyPage() {
  return (
    <main style={wrap}>
      <h1 style={h1}>Child Safety Standards</h1>
      <p style={sub}>Last updated: 14/07/1926</p>

      <div style={callout}>
        <p style={{ ...p, margin: 0, fontWeight: 600, color: '#f1f5fa' }}>
          Qup Pulse has zero tolerance for child sexual abuse and exploitation
          (CSAE). Content that sexualises, endangers, or exploits minors is
          strictly prohibited, is removed, and is reported to the relevant
          authorities.
        </p>
      </div>

      <p style={p}>
        Qup Pulse is operated by Qup DA (org. nr. 998185599), Trondheimsveien
        102 C, 0565 Oslo, Norway. This page describes the standards and measures
        we apply to keep children safe on our service, in line with Google Play's
        CSAE policy and Apple's App Store safety requirements.
      </p>

      <h2 style={h2}>Minimum age</h2>
      <p style={p}>
        Qup Pulse is intended for adults. Users must be at least 18 years old to
        create an account. Accounts we identify as belonging to anyone under 18
        are removed.
      </p>

      <h2 style={h2}>Prohibited content and conduct</h2>
      <p style={p}>The following are never permitted on Qup Pulse:</p>
      <ul style={listStyle}>
        <li>
          Child sexual abuse material (CSAM) in any form, including images,
          video, drawings, and text.
        </li>
        <li>Sexualisation of minors, including sexualised commentary or requests.</li>
        <li>
          Grooming, solicitation, or any attempt to establish sexual contact with
          a minor.
        </li>
        <li>
          Trafficking, endangerment, or the promotion or facilitation of harm to
          children.
        </li>
        <li>
          Sharing, requesting, or directing others to CSAE material on or off the
          platform.
        </li>
      </ul>

      <h2 style={h2}>How we prevent and detect abuse</h2>
      <ul style={listStyle}>
        <li>An 18+ age requirement enforced at account creation.</li>
        <li>
          In-app reporting on user profiles and on individual posts, so any user
          can flag content or accounts for review.
        </li>
        <li>
          A moderation process that reviews reports, with child-safety reports
          prioritised above all other categories.
        </li>
        <li>
          Enforcement tools that let us remove content and suspend or ban
          accounts that violate this standard.
        </li>
      </ul>

      <h2 style={h2}>How to report</h2>
      <p style={p}>
        In the app, use the report control on any post or profile (open the
        item's menu and choose Report). Select the child-safety reason so the
        report is prioritised for review.
      </p>
      <p style={p}>
        You can also contact our child-safety team directly at{' '}
        <a href="mailto:jan.egil.staff@qupda.com" style={link}>
          jan.egil.staff@qupda.com
        </a>
        . Reports are treated confidentially.
      </p>
      <p style={p}>
        If a child is in immediate danger, contact your local emergency services
        first. In Norway, call the police on 112.
      </p>

      <h2 style={h2}>How we respond</h2>
      <p style={p}>
        Reports involving child safety are reviewed with priority. When we
        confirm a violation, we remove the content, take action on the account
        (including permanent ban), preserve relevant evidence, and report to the
        appropriate authorities. Depending on jurisdiction, this includes the
        National Center for Missing and Exploited Children (NCMEC) and the
        Norwegian police (Kripos). We cooperate with law enforcement requests
        that are valid under applicable law.
      </p>

      <h2 style={h2}>Contact</h2>
      <p style={p}>
        Questions about these standards can be sent to{' '}
        <a href="mailto:jan.egil.staff@qupda.com" style={link}>
          jan.egil.staff@qupda.com
        </a>
        .
      </p>

      <p style={{ ...sub, marginTop: 40, marginBottom: 0 }}>
        This English version is provided for review and general information. It
        is not legal advice.
      </p>
    </main>
  );
}