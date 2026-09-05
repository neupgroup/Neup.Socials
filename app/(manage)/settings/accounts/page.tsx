import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { Badge } from '#/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table';
import { listAllAccountsAction } from '@/services/accounts/actions';

type Account = {
  id: string;
  platform: string;
  platformId: string | null;
  name: string | null;
  username: string | null;
  owner: string | null;
  status: string | null;
  category: string | null;
  nameStatus: string | null;
  connectedOn: string | null;
  updatedAt: string | null;
  lastSyncedAt: string | null;
  metadata: unknown;
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'yyyy-MM-dd HH:mm');
}

function formatMetadata(value: unknown) {
  if (value === null || value === undefined) return '—';
  try {
    return JSON.stringify(value);
  } catch {
    return 'Unavailable';
  }
}

export default async function SettingsAccountsPage() {
  const accounts = await listAllAccountsAction() as Account[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Connected Accounts</h1>
        <p className="text-muted-foreground">All social accounts currently stored for this application.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account records</CardTitle>
          <CardDescription>{accounts.length} account{accounts.length === 1 ? '' : 's'} found.</CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No connected accounts have been created yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Platform ID</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Name status</TableHead>
                  <TableHead>Connected</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Last synced</TableHead>
                  <TableHead>Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="min-w-[220px]">
                      <p className="font-medium">{account.name || account.username || 'Unnamed account'}</p>
                      <p className="text-xs text-muted-foreground">{account.platform} · {account.username || 'No username'}</p>
                      <p className="mt-1 max-w-[260px] truncate font-mono text-[10px] text-muted-foreground">{account.id}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{account.platformId || '—'}</TableCell>
                    <TableCell>{account.owner || '—'}</TableCell>
                    <TableCell><Badge variant={account.status?.toLowerCase() === 'active' ? 'default' : 'outline'}>{account.status || 'Unknown'}</Badge></TableCell>
                    <TableCell>{account.category || '—'}</TableCell>
                    <TableCell>{account.nameStatus || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(account.connectedOn)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(account.updatedAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(account.lastSyncedAt)}</TableCell>
                    <TableCell className="max-w-[260px] truncate font-mono text-xs" title={formatMetadata(account.metadata)}>{formatMetadata(account.metadata)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
