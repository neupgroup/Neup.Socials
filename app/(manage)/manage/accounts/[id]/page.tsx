'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getLocalAccountAction, syncLocalAccountAction } from '@/services/accounts/actions';

type Account = {
  account_id: string;
  displayName: string;
  displayImage: string;
  neupId: string | null;
  type: string;
  status: string;
  createdOn: string | null;
};

export default function ManageAccountDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [account, setAccount] = React.useState<Account | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [syncedAt, setSyncedAt] = React.useState<string | null>(null);

  const loadAccount = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getLocalAccountAction(params.id);
    setAccount(result as Account | null);
    if (!result) setError('Account not found.');
    setLoading(false);
  }, [params.id]);

  React.useEffect(() => { void loadAccount(); }, [loadAccount]);

  const syncAccount = async () => {
    setSyncing(true);
    setError(null);
    try {
      const result = await syncLocalAccountAction(params.id);
      if (!result.success) {
        setError(result.error ?? 'Could not sync account information.');
      } else {
        setAccount(result.account as Account);
        setSyncedAt(result.syncedAt ?? null);
      }
    } catch {
      setError('Could not sync account information.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading account…</div>;
  if (!account) return <div className="space-y-4"><p className="text-sm text-destructive">{error || 'Account not found.'}</p><Button variant="outline" onClick={() => router.push('/manage/accounts')}><ArrowLeft className="mr-2 h-4 w-4" />Back to accounts</Button></div>;

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><Button variant="ghost" className="mb-2 -ml-3" onClick={() => router.push('/manage/accounts')}><ArrowLeft className="mr-2 h-4 w-4" />Back to accounts</Button><h1 className="text-3xl font-bold">{account.displayName || 'Account details'}</h1><p className="font-mono text-xs text-muted-foreground">{account.account_id}</p></div><Button onClick={syncAccount} disabled={syncing}><RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />{syncing ? 'Syncing…' : 'Sync from Neup server'}</Button></div>
    {error && <p className="text-sm text-destructive">{error}</p>}
    {syncedAt && <p className="text-sm text-muted-foreground">Synced at {new Date(syncedAt).toLocaleString()}.</p>}
    <Card><CardHeader><CardTitle>Account information</CardTitle><CardDescription>Current data stored in the local accounts table.</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
      <div><p className="text-xs text-muted-foreground">Display name</p><p className="font-medium">{account.displayName || '—'}</p></div>
      <div><p className="text-xs text-muted-foreground">NeupID</p><p className="font-medium">{account.neupId || '—'}</p></div>
      <div><p className="text-xs text-muted-foreground">Type</p><p className="font-medium">{account.type}</p></div>
      <div><p className="text-xs text-muted-foreground">Status</p><Badge variant={account.status === 'active' ? 'default' : 'outline'}>{account.status}</Badge></div>
      <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Display image URL</p><p className="break-all font-mono text-xs">{account.displayImage || '—'}</p></div>
      <div><p className="text-xs text-muted-foreground">Created</p><p>{account.createdOn ? new Date(account.createdOn).toLocaleString() : '—'}</p></div>
    </CardContent></Card>
  </div>;
}
