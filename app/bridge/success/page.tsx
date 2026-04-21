import { Suspense } from 'react';
import BridgeSuccessClient from './bridge-success-client';

function BridgeSuccessFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="mx-auto h-20 w-20 rounded-full bg-muted" />
        <div className="h-6 rounded bg-muted" />
        <div className="h-4 rounded bg-muted" />
      </div>
    </div>
  );
}

export default function BridgeSuccessPage() {
  return (
    <Suspense fallback={<BridgeSuccessFallback />}>
      <BridgeSuccessClient />
    </Suspense>
  );
}
