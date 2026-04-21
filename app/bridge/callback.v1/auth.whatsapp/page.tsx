'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function WhatsAppEmbeddedSignupCallbackPage() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const errorMessage = errorDescription || error || (code ? null : 'Missing authorization code.');

  React.useEffect(() => {
    if (!window.opener) return;

    const payload: Record<string, string> = {
      type: 'WHATSAPP_EMBEDDED_SIGNUP_CODE',
    };

    if (code) payload.code = code;
    if (errorMessage) payload.error = errorMessage;

    window.opener.postMessage(payload, window.location.origin);

    if (code && !errorMessage) {
      const timer = setTimeout(() => {
        try {
          window.close();
        } catch (closeError) {
          console.warn('Failed to close window automatically:', closeError);
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [code, errorMessage]);

  const handleClose = () => {
    try {
      window.close();
    } catch (closeError) {
      window.location.href = '/accounts/add';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {errorMessage ? 'Embedded Signup Failed' : 'Embedded Signup Complete'}
        </h1>
        <p className="text-muted-foreground">
          {errorMessage || 'You can close this window and return to the app.'}
        </p>
        <Button onClick={handleClose} className="w-full" variant={errorMessage ? 'outline' : 'default'}>
          Close Window
        </Button>
      </div>
    </div>
  );
}
