// quppulse/app/support/page.js
//
// Support page for Qup Pulse — this is the URL you give Apple as your
// "Support URL". It appears publicly on your App Store product page, so it must
// resolve and offer a real way to get help.
//
// Fill the [PLACEHOLDER] value before publishing:
//   [CONTACT_EMAIL]   — the address users write to for help
// Use the same address in privacy/page.js, terms/page.js, and delete/page.js.

export const metadata = {
  title: 'Support — Qup Pulse',
  description: 'Get help with Qup Pulse.',
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
  ul: { marginBottom: 16, paddingLeft: 22 },
  li: { marginBottom: 8 },
  a: { color: '#3a6ea5', textDecoration: 'underline' },
  footer: { marginTop: 56, paddingTop: 24, borderTop: '1px solid #e4e8ee', color: '#6b7688', fontSize: 14 },
};

export default function SupportPage() {
  return (
    <main style={styles.main}>
      <h1 style={styles.h1}>Support</h1>

      <p style={styles.p}>
        Need help with Qup Pulse? We&apos;re here for you. Email us and we&apos;ll get back to
        you as soon as we can.
      </p>
      <p style={styles.p}>
        <a style={styles.a} href="mailto:[CONTACT_EMAIL]">[CONTACT_EMAIL]</a>
      </p>

      <h2 style={styles.h2}>Common questions</h2>
      <ul style={styles.ul}>
        <li style={styles.li}>
          <strong>How do I report a post or user?</strong> Open the post or profile, tap the
          menu, and choose Report. You can also block users so you no longer see their
          content or receive messages from them.
        </li>
        <li style={styles.li}>
          <strong>How do I delete my account?</strong> See our{' '}
          <a style={styles.a} href="/delete">account deletion page</a> for steps.
        </li>
        <li style={styles.li}>
          <strong>How is my data handled?</strong> Read our{' '}
          <a style={styles.a} href="/privacy">Privacy Policy</a>.
        </li>
        <li style={styles.li}>
          <strong>What are the rules?</strong> See our{' '}
          <a style={styles.a} href="/terms">Terms of Service</a>.
        </li>
      </ul>

      <h2 style={styles.h2}>Contact</h2>
      <p style={styles.p}>
        For anything not covered above, email{' '}
        <a style={styles.a} href="mailto:[CONTACT_EMAIL]">[CONTACT_EMAIL]</a> and we&apos;ll
        help.
      </p>

      <div style={styles.footer}>Qup DA · Oslo, Norway · org. nr. 998185599</div>
    </main>
  );
}