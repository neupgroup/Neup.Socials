import { Suspense } from 'react';
import CreatePostPageClient from './CreatePostPageClient';

export default function CreatePostPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <CreatePostPageClient />
    </Suspense>
  );
}
