// qup-pulse-admin/src/app/profile/[username]/following/page.js
'use client';

// Someone else's following list. Your own username resolves to your own list inside
// FollowList, so no redirect is needed here.

import { useParams } from 'next/navigation';
import FollowList from '../../../../components/FollowList';

export default function PublicFollowingPage() {
  const params = useParams();
  const username = decodeURIComponent(String(params?.username || ''));
  return <FollowList mode="following" username={username} />;
}
