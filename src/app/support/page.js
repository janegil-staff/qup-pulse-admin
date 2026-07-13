// quppulse/app/support/page.js
//
// Support page for Qup Pulse — this is the URL you give Apple as your
// "Support URL". It appears publicly on your App Store product page, so it must
// resolve and offer a real way to get help.
//
// Colors are tuned for a DARK site background: light text, transparent page
// background so it sits on your existing theme.
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
    maxWidth: 680,
    margin: '0 auto',
    padding: '64px 24px 96px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: '#e8ecf2',
    lineHeight: 1.7,
  },
  h1: { fontSize: 34, fontWeight: 700, marginBottom: 24, letterSpacing: '-0.02em', color: '#ffffff' },
  h2: { fontSize: 20, fontWeight: 700, marginTop: 44, marginBottom: 16, color: '#ffffff' },
  p: { marginBottom: 18, color: '#c7cfdb', fontSize: 17 },
  emailLine: { marginBottom: 18, fontSize: 18 },
  qa: { marginBottom: 20 },
  q: { color: '#ffffff', fontWeight: 600, display: 'block', marginBottom: 4 },
  aText: { color: '#c7cfdb', fontSize: 16 },
  a: { color: '#6ea8e8', textDecoration: 'none', fontWeight: 600 },
  footer: {
    marginTop: 56,
    paddingTop: 24,
    borderTop: '1px solid rgba(255,255,255,0.12)',
    color: '#8792a4',
    fontSize: 14,
  },
};

export default function SupportPage() {
  return (
    <main style={styles.main}>
      <h1 style={styles.h1}>Support</h1>

      <p style={styles.p}>
        Need help with Qup Pulse? We&apos;re here for you. Email us and we&apos;ll get back to
        you as soon as we can.
      </p>
      <p style={styles.emailLine}>
        <a style={styles.a} href="mailto:[CONTACT_EMAIL]">[CONTACT_EMAIL]</a>
      </p>

      <h2 style={styles.h2}>Common questions</h2>

      <div style={styles.qa}>
        <span style={styles.q}>How do I report a post or user?</span>
        <span style={styles.aText}>
          Open the post or profile, tap the menu, and choose Report. You can also block users
          so you no longer see their content or receive messages from them.
        </span>
      </div>

      <div style={styles.qa}>
        <span style={styles.q}>How do I delete my account?</span>
        <span style={styles.aText}>
          See our <a style={styles.a} href="/delete">account deletion page</a> for steps.
        </span>
      </div>

      <div style={styles.qa}>
        <span style={styles.q}>How is my data handled?</span>
        <span style={styles.aText}>
          Read our <a style={styles.a} href="/privacy">Privacy Policy</a>.
        </span>
      </div>

      <div style={styles.qa}>
        <span style={styles.q}>What are the rules?</span>
        <span style={styles.aText}>
          See our <a style={styles.a} href="/terms">Terms of Service</a>.
        </span>
      </div>

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