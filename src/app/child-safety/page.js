// quppulse/app/child-safety/page.js
//
// Child Safety Standards page for Qup Pulse.
// REQUIRED by Google Play for apps in the Social/Dating categories. The URL of
// this page goes in Play Console → Child safety standards → Standards URL.
// Must be a live, public, worldwide, read-only web page (NOT a PDF).
//
// IMPORTANT — this page is an ATTESTATION of real practices, not boilerplate:
//  - Everything stated here must be something Qup Pulse actually does.
//  - You are committing to detect/remove CSAM and report it to authorities.
//  - As a solo developer, make sure you have a real process to receive a
//    report, act on it, and report to the police / NCMEC before publishing.
//  - This is not legal advice. Child-safety compliance carries legal weight
//    (EU CSAM rules, national law) — consider legal review.
//
// Colors tuned for a DARK site background, matching the other pages.
// Fill the [PLACEHOLDER] value before publishing:
//   [CONTACT_EMAIL]   — child-safety contact (can be the developer email)

export const metadata = {
    title: 'Child Safety Standards — Qup Pulse',
    description:
        'Qup Pulse standards against child sexual abuse and exploitation, and how to report concerns.',
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

export default function ChildSafetyPage() {
    return (
        <main style={styles.main}>
            <h1 style={styles.h1}>Child Safety Standards</h1>

            <p style={styles.p}>
                Qup DA operates the Qup Pulse app and is committed to protecting children from
                sexual abuse and exploitation. We have zero tolerance for child sexual abuse material
                (CSAM) and for any content or behavior that sexualizes, endangers, or exploits
                children. This page describes our standards and how to report concerns.
            </p>

            <h2 style={styles.h2}>Our commitment</h2>
            <p style={styles.p}>
                Qup Pulse is intended only for adults aged 18 and over. We prohibit child sexual
                abuse material and any attempt to groom, solicit, or exploit a minor. Accounts that
                engage in this behavior are permanently removed.
            </p>

            <h2 style={styles.h2}>What is prohibited</h2>
            <ul style={styles.ul}>
                <li style={styles.li}>Any child sexual abuse material (CSAM), in any form.</li>
                <li style={styles.li}>Sexualization of minors, including in text, images, or links.</li>
                <li style={styles.li}>Grooming, solicitation, or attempts to contact or exploit a minor.</li>
                <li style={styles.li}>Sharing, requesting, or linking to CSAM or related content.</li>
            </ul>

            <h2 style={styles.h2}>How to report</h2>
            <p style={styles.p}>
                Users can report content or other users directly in the app: open the post or
                profile, tap the menu, and choose Report. Reports of child-safety concerns are
                treated as the highest priority.
            </p>
            <p style={styles.p}>
                You can also report child-safety concerns to us by email at{' '}
                <a style={styles.a} href="mailto:[CONTACT_EMAIL]">[CONTACT_EMAIL]</a>.
            </p>

            <h2 style={styles.h2}>How we respond</h2>
            <p style={styles.p}>
                We review reports of child-safety concerns promptly. When we identify prohibited
                content, we remove it and remove the responsible account. Where required by law, we
                report child sexual abuse material to the relevant national and regional authorities,
                including law enforcement and the National Center for Missing &amp; Exploited Children
                (NCMEC) or equivalent bodies.
            </p>

            <h2 style={styles.h2}>Compliance</h2>
            <p style={styles.p}>
                Qup Pulse complies with applicable child-safety laws and cooperates with authorities
                in the investigation of child sexual abuse and exploitation. These standards apply to
                all users and all content on the app.
            </p>

            <h2 style={styles.h2}>Contact</h2>
            <p style={styles.p}>
                Our designated child-safety contact can be reached at{' '}
                <a style={styles.a} href="mailto:jan.egil.staff@qupda.com">jan.egil.staff@qupda.com</a>.
            </p>

            <div style={styles.footer}>Qup DA · Oslo, Norway · org. nr. 998185599</div>
        </main>
    );
}