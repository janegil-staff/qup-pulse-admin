// qup-pulse-admin/src/app/following/page.js
'use client';

// Your own following list — linked from the count on /profile.

import FollowList from '../../components/FollowList';

export default function FollowingPage() {
  return <FollowList mode="following" />;
}
