'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { logError } from '@/core/lib/error-logging';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log the error to our logging service
    logError({
      process: 'Client-side Rendering',
      location: 'GlobalError Boundary',
      errorMessage: error.message,
      context: {
        stack: error.stack,
        digest: error.digest,
      },
    }).catch(console.error); // Log to console if logging service fails
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-2xl text-destructive">
            <AlertTriangle className="h-8 w-8" />
            Application Error
          </CardTitle>
          <CardDescription>
            We're sorry, but something went wrong.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            An unexpected error has occurred. Our team has been notified. Please try refreshing the page or clicking the button below.
          </p>
          <Button onClick={() => reset()}>
            Try again
          </Button>
          <details className="text-xs text-muted-foreground text-left p-2 bg-muted rounded-md">
              <summary>Error Details</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all">
                {error.message}
              </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
