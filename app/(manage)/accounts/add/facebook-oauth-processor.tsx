'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Card, CardContent } from '#/components/ui/card';
import { application } from '@/base/application';

export default function FacebookOAuthProcessor() {
  const params = useSearchParams();
  const processed = React.useRef(false);
  const [result, setResult] = React.useState<{ state: 'processing' | 'success' | 'error'; message: string }>();

  React.useEffect(() => {
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state || processed.current) return;
    processed.current = true;
    setResult({ state: 'processing', message: 'We are exchanging your authorization and saving the connected accounts.' });
    fetch(`${application.appBasePath}/bridge/api.v1/accounts/facebook/callback`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, state }) })
      .then(async (response) => { const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error || 'Authorization processing failed.'); setResult({ state: 'success', message: data.message || 'Account information was saved successfully.' }); window.history.replaceState(null, '', '/socials/accounts/add'); })
      .catch((error: Error) => setResult({ state: 'error', message: error.message }));
  }, [params]);

  if (!result) return null;
  const Icon = result.state === 'processing' ? Loader2 : result.state === 'success' ? CheckCircle2 : XCircle;
  return <Card className="mx-auto mb-6 max-w-2xl"><CardContent className="flex gap-3 pt-6"><Icon className={`mt-0.5 h-5 w-5 ${result.state === 'processing' ? 'animate-spin text-primary' : result.state === 'success' ? 'text-green-600' : 'text-destructive'}`} /><div><p className="font-medium">{result.state === 'processing' ? 'Processing authorization…' : result.state === 'success' ? 'Authorization granted' : 'Authorization failed'}</p><p className="mt-1 text-sm text-muted-foreground">{result.message}</p></div></CardContent></Card>;
}
