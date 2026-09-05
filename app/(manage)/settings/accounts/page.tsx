import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import { Badge } from '#/components/ui/badge';
import { listLocalAccountsAction } from '@/services/accounts/actions';

type PlatformAccount = {
  id: string;
  connectionId: string;
  displayName: string;
  displayImage: string;
  neupId: string | null;
  type: string;
  status: string;
};

export default async function SettingsAccountsPage() {
  const accounts = await listLocalAccountsAction() as PlatformAccount[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform Accounts</h1>
        <p className="text-muted-foreground">Accounts created and stored in this platform.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Account records</CardTitle>
          <CardDescription>{accounts.length} account{accounts.length === 1 ? '' : 's'} found.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {accounts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No platform accounts have been created yet.</p>
          ) : accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={account.displayImage || undefined} alt={account.displayName || 'Account'} />
                  <AvatarFallback>{(account.displayName || account.id).slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{account.displayName || 'Unnamed account'}</p>
                  <p className="truncate text-sm text-muted-foreground">{account.neupId || 'No NeupID'} · {account.type}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{account.id} · {account.connectionId}</p>
                </div>
              </div>
              <Badge variant={account.status === 'active' ? 'default' : 'outline'}>{account.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
