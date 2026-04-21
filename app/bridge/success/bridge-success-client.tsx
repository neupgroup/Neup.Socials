'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BridgeSuccessClient() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status') || 'success';
  const platform = searchParams.get('platform') || 'Facebook';
  const error = searchParams.get('error');

  React.useEffect(() => {
    // Attempt to notify the opener/parent window
    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'OAUTH_CALLBACK_SUCCESS',
          status: error ? 'error' : 'success',
          platform,
          error,
        },
        window.location.origin
      );

      // If it's a success, we can attempt to close automatically after a short delay
      if (!error) {
        const timer = setTimeout(() => {
          try {
            window.close();
          } catch (e) {
            console.warn('Failed to close window automatically:', e);
          }
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [error, platform]);

  const handleClose = () => {
    try {
      window.close();
    } catch (e) {
      // Fallback for when window.close() is blocked or didn't work (e.g. not a popup)
      window.location.href = '/accounts';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        {error ? (
          <div className="space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
              <span className="text-3xl text-destructive font-bold">!</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Connection Failed</h1>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={handleClose} variant="outline" className="w-full">
              Close and Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Account Connected</h1>
            <p className="text-muted-foreground">
              Your {platform} account has been successfully connected to Neup Socials.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Closing this window automatically...</span>
            </div>
            <Button onClick={handleClose} className="w-full">
              Manage Accounts
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
