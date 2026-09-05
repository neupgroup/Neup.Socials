import Link from 'next/link';
import { Badge } from '#/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import { listLocalAccountsAction } from '@/services/accounts/actions';

type LocalAccount = {
  account_id: string;
  displayName: string;
  displayImage: string;
  neupId: string | null;
  type: string;
  createdOn: Date | string;
  status: string;
  moreDetails: unknown;
};

export default async function ManageAccountsPage() {
  const accounts = await listLocalAccountsAction() as LocalAccount[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Accounts</h1>
        <p className="text-muted-foreground">All accounts stored in the local accounts table.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Account records</CardTitle>
          <CardDescription>{accounts.length} account{accounts.length === 1 ? '' : 's'} found.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {accounts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No accounts have been created yet.</p>
          ) : (
            <div className="overflow-hidden rounded-b-xl border-t border-border">
              {accounts.map((account) => (
                <Link key={account.account_id} href={`/manage/accounts/${account.account_id}`} className="group block border-b border-border bg-card p-5 transition-colors last:border-b-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <Avatar className="h-12 w-12 shrink-0 border">
                        <AvatarImage src={account.displayImage || undefined} alt={account.displayName || 'Account'} />
                        <AvatarFallback>{(account.displayName || account.account_id).slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-semibold group-hover:text-primary">{account.displayName || 'Unnamed account'}</p>
                        <p className="truncate text-sm text-muted-foreground">{account.neupId || 'No NeupID'} · {account.type}</p>
                      </div>
                    </div>
                    <Badge variant={account.status === 'active' ? 'default' : 'outline'}>{account.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
