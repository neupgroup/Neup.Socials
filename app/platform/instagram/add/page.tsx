import { Suspense } from 'react';
import { PlatformCallbackPage } from '@/app/platform/PlatformCallbackPage';

export default function InstagramCallbackPage() {
  return (
    <Suspense fallback={null}>
      <PlatformCallbackPage platform="instagram" />
    </Suspense>
  );
}
