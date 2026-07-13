// quppulse/app/privacy/page.js
//
// Privacy Policy for Qup Pulse.
// Review-ready English draft — NOT legal advice. Have a lawyer review before
// launch, especially the GDPR / EU personal-data sections.
//
// Colors tuned for a DARK site background.
// Fill the [PLACEHOLDER] values before publishing:
//   [CONTACT_EMAIL]   — support/privacy contact address
//   [LAST_UPDATED]    — date this policy last changed

export const metadata = {
  title: 'Privacy Policy — Qup Pulse',
  description: 'How Qup Pulse collects, uses, and protects your personal data.',
};

const styles = {
  main: {
    maxWidth: 680,
    margin: '0 auto',
    padding: '64px 24px 96px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: '#e8ecf2',
    lineHeight: 1.7,
  },
  h1: { fontSize: 34, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em', color: '#ffffff' },
  updated: { color: '#8792a4', fontSize: 14, marginBottom: 40 },
  h2: { fontSize: 20, fontWeight: 700, marginTop: 44, marginBottom: 14, color: '#ffffff' },
  p: { marginBottom: 18, color: '#c7cfdb', fontSize: 17 },
  ul: { marginBottom: 18, paddingLeft: 22, color: '#c7cfdb', fontSize: 16 },
  li: { marginBottom: 8 },
  a: { color: '#6ea8e8', textDecoration: 'none', fontWeight: 600 },
  footer: {
    marginTop: 56,
    paddingTop: 24,
    borderTop: '1px solid rgba(255,255,255,0.12)',
    color: '#8792a4',
    fontSize: 14,
  },
};

export default function PrivacyPage() {
  return (
    <main style={styles.main}>
      <h1 style={styles.h1}>Privacy Policy</h1>
      <p style={styles.updated}>Last updated: 13/07/2026</p>

      <p style={styles.p}>
        This Privacy Policy explains how Qup DA (&quot;we&quot;, &quot;us&quot;) collects, uses, and
        protects your personal data when you use the Qup Pulse app. Qup DA is the data
        controller. We are registered in Oslo, Norway (org. nr. 998185599).
      </p>
      <p style={styles.p}>Qup Pulse is intended only for users aged 18 and over.</p>

      <h2 style={styles.h2}>Information we collect</h2>
      <ul style={styles.ul}>
        <li style={styles.li}>Account information: your email address and PIN.</li>
        <li style={styles.li}>Profile information: your username, display name, and profile photo.</li>
        <li style={styles.li}>Content you create: posts, comments, messages, and images you share.</li>
        <li style={styles.li}>Approximate location, used to show you nearby posts. You can control this through your device settings.</li>
      </ul>

      <h2 style={styles.h2}>How we use your information</h2>
      <ul style={styles.ul}>
        <li style={styles.li}>To provide and operate the app, including your feed, messages, and profile.</li>
        <li style={styles.li}>To show you relevant nearby content.</li>
        <li style={styles.li}>To keep the service safe, including handling reports and moderation.</li>
        <li style={styles.li}>To send you service-related emails, such as verification and password reset.</li>
      </ul>

      <h2 style={styles.h2}>Service providers</h2>
      <p style={styles.p}>We share limited data with trusted providers who process it on our behalf:</p>
      <ul style={styles.ul}>
        <li style={styles.li}>Cloudinary — image storage and delivery.</li>
        <li style={styles.li}>Resend — sending service emails.</li>
        <li style={styles.li}>Expo — app infrastructure and delivery.</li>
      </ul>
      <p style={styles.p}>
        These providers only process data as needed to provide their services and are bound
        by their own data-protection obligations.
      </p>

      <h2 style={styles.h2}>Your rights</h2>
      <p style={styles.p}>
        Under the GDPR you have the right to access, correct, or delete your personal data,
        and to object to or restrict its processing. You can delete your account and
        associated data at any time from within the app — see our{' '}
        <a style={styles.a} href="/delete">account deletion page</a> for steps.
      </p>

      <h2 style={styles.h2}>Data retention</h2>
      <p style={styles.p}>
        We keep your personal data for as long as your account is active. When you delete
        your account, we delete your personal data, except where we are required to retain
        certain information to comply with legal obligations.
      </p>

      <h2 style={styles.h2}>Contact</h2>
      <p style={styles.p}>
        For any privacy questions or to exercise your rights, contact us at{' '}
        <a style={styles.a} href="mailto:jan.egil.staff@qupda.com">jan.egil.staff@qupda.com</a>.
      </p>

      <div style={styles.footer}>Qup DA · Oslo, Norway · org. nr. 998185599</div>
    </main>
  );
}