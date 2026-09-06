import { Suspense } from 'react';
import { PlatformCallbackPage } from '@/app/platform/PlatformCallbackPage';

export default function WhatsAppCallbackPage() {
  return (
    <Suspense fallback={null}>
      <PlatformCallbackPage platform="whatsapp" />
    </Suspense>
  );
}
