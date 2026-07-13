// localpulse-admin/app/layout.js
import './globals.css';

export const metadata = {
  title: 'LocalPulse Admin',
  description: 'Moderation dashboard for LocalPulse reports.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
