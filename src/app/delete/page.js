// quppulse/app/delete/page.js
//
// Account deletion instructions for Qup Pulse.
// This is the informational page Apple expects: it explains how to delete an
// account from inside the app (deletion itself happens in-app).
// Review-ready English draft — NOT legal advice.
//
// Fill the [PLACEHOLDER] values before publishing:
//   [CONTACT_EMAIL]   — support contact address
// Confirm the numbered steps below match the app's actual menu labels.

export const metadata = {
  title: 'Delete Your Account — Qup Pulse',
  description: 'How to delete your Qup Pulse account and what data is removed.',
};

const styles = {
  main: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '64px 24px 96px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: '#1a2332',
    lineHeight: 1.65,
  },
  h1: { fontSize: 32, fontWeight: 700, marginBottom: 24, letterSpacing: '-0.02em' },
  h2: { fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 },
  p: { marginBottom: 16 },
  ol: { marginBottom: 16, paddingLeft: 22 },
  li: { marginBottom: 10 },
  ul: { marginBottom: 16, paddingLeft: 22 },
  a: { color: '#3a6ea5', textDecoration: 'underline' },
  footer: { marginTop: 56, paddingTop: 24, borderTop: '1px solid #e4e8ee', color: '#6b7688', fontSize: 14 },
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
        <li style={styles.li}>Open Qup Pulse and go to <strong>Settings</strong>.</li>
        <li style={styles.li}>Tap <strong>Personal Settings</strong>.</li>
        <li style={styles.li}>Tap <strong>Delete Account</strong>.</li>
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
        <a style={styles.a} href="mailto:[CONTACT_EMAIL]">[CONTACT_EMAIL]</a> and we&apos;ll
        help you.
      </p>

      <div style={styles.footer}>Qup DA · Oslo, Norway · org. nr. 998185599</div>
    </main>
  );
}