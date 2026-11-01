// qup-pulse-admin/src/app/verifyLP/page.js
//
// Landing page for the link in the verification email:
//   https://quppulse.com/verifyLP?token=<hex>
// The API builds that URL from CLIENT_URL (see local-puls-api/src/lib/mail.js).
// The path stays "verifyLP" so it matches links the API already sends.
//
// Server component: reads the token from searchParams (a Promise in this
// Next version) and hands it to the client component, which calls the API.
import VerifyClient from './VerifyClient';

export const metadata = { title: 'Confirm email — Qup Pulse' };

export default async function VerifyPage({ searchParams }) {
  const { token } = await searchParams;
  return <VerifyClient token={typeof token === 'string' ? token : ''} />;
}
