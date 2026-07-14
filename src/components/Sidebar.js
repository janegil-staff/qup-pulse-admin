// qup-pulse-admin/src/components/Sidebar.js
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { href: '/overview', label: 'Overview' },
  { href: '/reports', label: 'Reports' },
  { href: '/users', label: 'Users' },
  { href: '/posts', label: 'Posts' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <aside
      style={{
        width: 220,
        borderRight: '1px solid var(--border)',
        padding: '20px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minHeight: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      <div style={{ padding: '0 12px 20px', fontWeight: 700, fontSize: 16 }}>
        Qup Pulse
        <div className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
          Admin
        </div>
      </div>

      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'block',
              padding: '10px 12px',
              borderRadius: 8,
              color: active ? 'var(--text)' : 'var(--text-dim)',
              background: active ? 'var(--surface-2)' : 'transparent',
              fontWeight: active ? 600 : 400,
            }}
          >
            {item.label}
          </Link>
        );
      })}

      <div style={{ marginTop: 'auto', padding: '0 4px' }}>
        <button className="ghost" onClick={signOut} style={{ width: '100%' }}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
