import { Suspense } from 'react';
import InboxPageClient from '../InboxPageClient';

export default function FacebookInboxPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <InboxPageClient />
    </Suspense>
  );
}
