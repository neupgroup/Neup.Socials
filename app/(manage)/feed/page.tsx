import { Suspense } from 'react';
import ContentDashboardPageClient from './ContentDashboardPageClient';

export default function ContentDashboardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <ContentDashboardPageClient />
    </Suspense>
  );
}
