// qup-pulse-admin/src/app/followers/page.js
'use client';

// Your own followers list — linked from the count on /profile.

import FollowList from '../../components/FollowList';

export default function FollowersPage() {
  return <FollowList mode="followers" />;
}
