// localpulse-admin/app/page.js
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '../lib/api.js';

// The root is just a router: authed → reports, otherwise → login. Reports and
// login each guard themselves too, so this is a convenience, not the gate.
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace(getToken() ? '/reports' : '/login');
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center text-slate-500">
      Loading…
    </div>
  );
}
