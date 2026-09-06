import { Suspense } from 'react';
import { PlatformCallbackPage } from '@/app/platform/PlatformCallbackPage';

export default function FacebookCallbackPage() {
  return (
    <Suspense fallback={null}>
      <PlatformCallbackPage platform="facebook" />
    </Suspense>
  );
}
