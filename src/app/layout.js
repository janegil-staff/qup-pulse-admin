// qup-pulse-admin/src/app/layout.js
import './globals.css';
import { LandingLangProvider } from '../context/LandingLang';
import Footer from '../components/Footer';

export const metadata = { title: 'Qup Pulse' };

// Applies the stored theme to <html> before React hydrates.
//
// useDarkMode() sets the class in a useEffect, which means a route only goes
// dark if one of its components happens to call the hook — /privacy, /register
// and the other legal pages didn't, so they rendered light regardless of the
// saved preference. Doing it here makes every route correct by default,
// including ones not written yet, and removes the flash of light theme on load
// (the effect runs after first paint; this runs before it).
//
// suppressHydrationWarning on <html> is required: this script mutates the
// className that the server rendered, and React would otherwise flag the
// mismatch. It's scoped to this element's attributes only.
//
// Keys and logic MUST match lib/useDarkMode.js — 'quppulse_theme', values
// 'dark' | 'light', default dark unless the OS says light.
const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('quppulse_theme');
    var isDark = stored === 'dark'
      || (stored !== 'light' && !window.matchMedia('(prefers-color-scheme: light)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) { /* localStorage blocked — fall through to the default */ }
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <LandingLangProvider>
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </LandingLangProvider>
      </body>
    </html>
  );
}