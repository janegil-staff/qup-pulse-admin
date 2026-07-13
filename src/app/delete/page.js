// quppulse/app/delete/page.js
//
// Account deletion instructions for Qup Pulse.
// This is the informational page Apple expects: it explains how to delete an
// account from inside the app (deletion itself happens in-app).
// Review-ready English draft — NOT legal advice.
//
// Colors tuned for a DARK site background.
// Fill the [PLACEHOLDER] values before publishing:
//   [CONTACT_EMAIL]   — support contact address
// Confirm the numbered steps below match the app's actual menu labels.

export const metadata = {
  title: 'Delete Your Account — Qup Pulse',
  description: 'How to delete your Qup Pulse account and what data is removed.',
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
  h1: { fontSize: 34, fontWeight: 700, marginBottom: 24, letterSpacing: '-0.02em', color: '#ffffff' },
  h2: { fontSize: 20, fontWeight: 700, marginTop: 44, marginBottom: 14, color: '#ffffff' },
  p: { marginBottom: 18, color: '#c7cfdb', fontSize: 17 },
  ol: { marginBottom: 18, paddingLeft: 22, color: '#c7cfdb', fontSize: 16 },
  ul: { marginBottom: 18, paddingLeft: 22, color: '#c7cfdb', fontSize: 16 },
  li: { marginBottom: 10 },
  strong: { color: '#ffffff' },
  a: { color: '#6ea8e8', textDecoration: 'none', fontWeight: 600 },
  footer: {
    marginTop: 56,
    paddingTop: 24,
    borderTop: '1px solid rgba(255,255,255,0.12)',
    color: '#8792a4',
    fontSize: 14,
  },
};

export default function DeletePage() {
  return (
    <main style={styles.main}>
      <h1 style={styles.h1}>Delete your account</h1>

      <p style={styles.p}>
        You can delete your Qup Pulse account at any time, directly in the app. Deleting your
        account is permanent and cannot be undone.
      </p>

      <h2 style={styles.h2}>Steps</h2>
      <ol style={styles.ol}>
        {/* CONFIRM these labels match the app's actual UI before publishing. */}
        <li style={styles.li}>Open Qup Pulse and go to <strong style={styles.strong}>Settings</strong>.</li>
        <li style={styles.li}>Tap <strong style={styles.strong}>Personal Settings</strong>.</li>
        <li style={styles.li}>Tap <strong style={styles.strong}>Delete Account</strong>.</li>
        <li style={styles.li}>Confirm when prompted. Your account and data will be deleted.</li>
      </ol>

      <h2 style={styles.h2}>What gets deleted</h2>
      <ul style={styles.ul}>
        <li style={styles.li}>Your account and profile (username, display name, photo).</li>
        <li style={styles.li}>Your posts, comments, messages, and images.</li>
        <li style={styles.li}>Your email address and login details.</li>
      </ul>
      <p style={styles.p}>
        We may retain limited information where required to comply with legal obligations.
        For more detail, see our <a style={styles.a} href="/privacy">Privacy Policy</a>.
      </p>

      <h2 style={styles.h2}>Need help?</h2>
      <p style={styles.p}>
        If you can&apos;t access the app to delete your account, contact us at{' '}
        <a style={styles.a} href="mailto:jan.egil.staff@qupda.com">jan.egil.staff@qupda.com</a> and we&apos;ll
        help you.
      </p>

      <div style={styles.footer}>Qup DA · Oslo, Norway · org. nr. 998185599</div>
    </main>
  );
}