import { Suspense } from 'react';
import { PlatformCallbackPage } from '@/app/platform/PlatformCallbackPage';

export default function LinkedInCallbackPage() {
  return (
    <Suspense fallback={null}>
      <PlatformCallbackPage platform="linkedin" />
    </Suspense>
  );
}
