// qup-pulse-admin/src/app/profile/[username]/followers/page.js
'use client';

// Someone else's followers list. Your own username resolves to your own list inside
// FollowList, so no redirect is needed here.

import { useParams } from 'next/navigation';
import FollowList from '../../../../components/FollowList';

export default function PublicFollowersPage() {
  const params = useParams();
  const username = decodeURIComponent(String(params?.username || ''));
  return <FollowList mode="followers" username={username} />;
}
