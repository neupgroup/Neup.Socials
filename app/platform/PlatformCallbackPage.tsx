'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import data from '$/data.json';

type Platform = 'facebook' | 'instagram' | 'whatsapp' | 'linkedin';

const platformData = data as Record<Platform, { handler_url?: string }>;

export function PlatformCallbackPage({ platform }: { platform: Platform }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = React.useState('Processing authorization…');

  React.useEffect(() => {
    const handlerUrl = platformData[platform]?.handler_url;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!handlerUrl || !code) {
      setMessage('Authorization response is incomplete.');
      return;
    }

    fetch(handlerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Authorization failed.');
        setMessage('Authorization completed successfully. Redirecting…');
        window.setTimeout(() => router.push('/'), 800);
      })
      .catch((error: Error) => setMessage(error.message));
  }, [platform, router, searchParams]);

  return <main className="flex min-h-screen items-center justify-center bg-background p-6"><div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-lg"><div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-full bg-primary/20" /><h1 className="text-xl font-semibold">Connecting {platform}</h1><p className="mt-2 text-sm text-muted-foreground">{message}</p></div></main>;
}
