// qup-pulse-admin/src/app/layout.js
import './globals.css';
import { LandingLangProvider } from '../context/LandingLang';
import Footer from '../components/Footer';

export const metadata = { title: 'Qup Pulse' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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