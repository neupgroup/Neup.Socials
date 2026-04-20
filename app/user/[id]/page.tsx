import { Suspense } from 'react';
import UserProfilePageClient from './UserProfilePageClient';

export default function UserProfilePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <UserProfilePageClient />
    </Suspense>
  );
}
