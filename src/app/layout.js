// quppulse/src/app/layout.js
//
// Root layout. Wraps the whole site in LandingLangProvider so useLang() works
// on the landing page (and anywhere else that needs it).
//
// This stays a server component — importing a 'use client' provider and using
// it here is fine; Next handles the boundary. If you already have a layout.js
// with other providers/metadata, just ADD the <LandingLangProvider> wrapper
// around {children} rather than replacing the whole file.
import './globals.css';
import { LandingLangProvider } from '../context/LandingLang';

export const metadata = {
  title: 'Qup Pulse',
  description: "The local pulse of your neighbourhood.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <LandingLangProvider>{children}</LandingLangProvider>
      </body>
    </html>
  );
}