// quppulse/app/terms/page.js
//
// Terms of Service / EULA for Qup Pulse.
// Review-ready English draft — NOT legal advice. Have a lawyer review before
// launch. The "Objectionable content" section is required for Apple App Store
// approval of user-generated-content apps (Guideline 1.2) — keep it.
//
// Colors tuned for a DARK site background.
// Fill the [PLACEHOLDER] values before publishing:
//   [CONTACT_EMAIL]   — support contact address
//   [LAST_UPDATED]    — date these terms last changed

export const metadata = {
  title: 'Terms of Service — Qup Pulse',
  description: 'The terms that govern your use of Qup Pulse.',
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
  a: { color: '#6ea8e8', textDecoration: 'none', fontWeight: 600 },
  footer: {
    marginTop: 56,
    paddingTop: 24,
    borderTop: '1px solid rgba(255,255,255,0.12)',
    color: '#8792a4',
    fontSize: 14,
  },
};

export default function TermsPage() {
  return (
    <main style={styles.main}>
      <h1 style={styles.h1}>Terms of Service</h1>
      <p style={styles.updated}>Last updated: [LAST_UPDATED]</p>

      <p style={styles.p}>
        These Terms govern your use of the Qup Pulse app, provided by Qup DA (&quot;we&quot;,
        &quot;us&quot;), registered in Oslo, Norway (org. nr. 998185599). By creating an account or
        using the app, you agree to these Terms.
      </p>

      <h2 style={styles.h2}>Eligibility</h2>
      <p style={styles.p}>
        You must be at least 18 years old to use Qup Pulse. By using the app you confirm
        that you meet this requirement.
      </p>

      <h2 style={styles.h2}>Your account</h2>
      <p style={styles.p}>
        You are responsible for keeping your login details secure and for the activity that
        happens under your account. Let us know right away if you believe your account has
        been compromised.
      </p>

      <h2 style={styles.h2}>Content you share</h2>
      <p style={styles.p}>
        You own the content you post, but you grant us the license needed to host and show
        it within the app. You are responsible for the content you share, and you agree not
        to post anything unlawful or that infringes others&apos; rights.
      </p>

      <h2 style={styles.h2}>Objectionable content and conduct</h2>
      <p style={styles.p}>
        There is no tolerance for objectionable content or abusive behavior on Qup Pulse.
        You agree not to post content that is harassing, threatening, hateful, sexually
        explicit, or otherwise objectionable, and not to harass or abuse other users.
      </p>
      <p style={styles.p}>
        You can report content or users directly in the app, and you can block users so you
        no longer see their content or receive messages from them. We review reports and may
        remove content or remove users who violate these Terms. We aim to act on reports of
        objectionable content promptly.
      </p>

      <h2 style={styles.h2}>Deleting your account</h2>
      <p style={styles.p}>
        You can delete your account at any time from within the app. See our{' '}
        <a style={styles.a} href="/delete">account deletion page</a> for steps.
      </p>

      <h2 style={styles.h2}>Disclaimers and liability</h2>
      <p style={styles.p}>
        The app is provided &quot;as is&quot; without warranties of any kind. To the extent
        permitted by law, we are not liable for indirect or consequential damages arising
        from your use of the app.
      </p>

      <h2 style={styles.h2}>Changes to these Terms</h2>
      <p style={styles.p}>
        We may update these Terms from time to time. If we make significant changes, we will
        take reasonable steps to let you know. Continued use of the app means you accept the
        updated Terms.
      </p>

      <h2 style={styles.h2}>Contact</h2>
      <p style={styles.p}>
        Questions about these Terms? Contact us at{' '}
        <a style={styles.a} href="mailto:[CONTACT_EMAIL]">[CONTACT_EMAIL]</a>.
      </p>

      <div style={styles.footer}>Qup DA · Oslo, Norway · org. nr. 998185599</div>
    </main>
  );
}