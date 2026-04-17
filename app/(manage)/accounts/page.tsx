
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Twitter, Facebook, Linkedin, Instagram, MoreHorizontal, Loader2, Search, RefreshCw, Edit, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/core/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { syncPostsAction as syncFacebookPostsAction } from '@/services/facebook/sync-posts';
import { syncLinkedInPostsAction } from '@/services/linkedin/sync-posts';
import { disconnectAccountAction } from '@/services/accounts';
import { listAccountsAction } from '@/services/db';

type Account = {
  id: string;
  platform: string;
  username: string;
  name?: string;
  connectedOn: string;
  lastSyncedAt?: string | null;
  status: string;
  icon: React.ReactNode;
  owner: string;
};

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M.052 24l1.688-6.164a11.91 11.91 0 01-1.74-6.36C.002 5.075 5.373 0 12.002 0s11.998 5.074 11.998 11.474c0 6.4-5.372 11.475-11.998 11.475a11.859 11.859 0 01-5.94-1.542L.052 24zm6.65-3.666a9.888 9.888 0 0011.082-9.556c0-5.473-4.437-9.91-9.91-9.91-5.473 0-9.91 4.437-9.91 9.91a9.89 9.89 0 003.834 7.62l-1.12 4.09 4.2-1.074zM12.002 2.148c4.34 0 7.864 3.525 7.864 7.864s-3.524 7.864-7.864 7.864-7.864-3.525-7.864-7.864c0-2.12.842-4.045 2.215-5.48a7.765 7.765 0 015.65-2.384zm-3.097 2.922c-.15-.002-.325.042-.47.27-.144.228-.48.77-.582.92-.102.148-.204.168-.346.102-.143-.064-1.012-.468-1.928-1.19a6.685 6.685 0 01-1.39-1.623c-.144-.246-.072-.38.06-.504.12-.11.264-.288.396-.432.108-.12.144-.204.216-.348.072-.143.036-.264-.012-.348-.05-.084-.468-.996-.636-1.356-.156-.324-.312-.276-.432-.282-.11-.006-.24-.006-.372-.006-.131 0-.347.042-.522.282-.174.24-.66.636-.66 1.542 0 .906.672 1.782.768 1.902.096.12 1.32 2.016 3.204 2.82.42.18.768.288 1.032.372.432.144.828.12 1.14.072.36-.06.996-.528 1.14-1.032.143-.504.143-.924.108-1.008-.036-.084-.144-.132-.3-.216z"/>
    </svg>
);


const PlatformIcon = ({ platform }: { platform: string }) => {
    switch(platform) {
        case 'Twitter': return <Twitter className="h-5 w-5 text-blue-400" />;
        case 'LinkedIn': return <Linkedin className="h-5 w-5 text-blue-700" />;
        case 'Facebook': return <Facebook className="h-5 w-5 text-blue-600" />;
        case 'Instagram': return <Instagram className="h-5 w-5 text-pink-500" />;
        case 'WhatsApp': return <WhatsAppIcon className="h-5 w-5 text-green-500" />;
        default: return null;
    }
}

const PAGE_SIZE = 10;

export default function AccountsPage() {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [syncingAccountId, setSyncingAccountId] = React.useState<string | null>(null);
  const [deletingAccountId, setDeletingAccountId] = React.useState<string | null>(null);

  const { toast } = useToast();
  const owner = 'neupkishor'; // This should be dynamic in a real app
  const router = useRouter();

  const fetchAccounts = React.useCallback(async (loadMore = false, search = '') => {
    if(!loadMore) setLoading(true);
    else setLoadingMore(true);

    try {
      const skip = loadMore ? accounts.length : 0;
      const result = await listAccountsAction({ owner, search, skip });
      const newAccounts = result.items.map((data) => {
          return {
            id: data.id,
            platform: data.platform,
            username: data.username,
            name: data.name,
            connectedOn: data.connectedOn ? format(new Date(data.connectedOn), 'yyyy-MM-dd') : '-',
            lastSyncedAt: data.lastSyncedAt,
            status: data.status,
            owner: data.owner,
            icon: <PlatformIcon platform={data.platform} />,
          } as Account;
        });

      setHasMore(result.hasMore);
      setAccounts(prev => loadMore ? [...prev, ...newAccounts] : newAccounts);
      setLoading(false);
      setLoadingMore(false);
    } catch (error) {
      console.error("Error fetching accounts: ", error);
      toast({ title: 'Error fetching accounts', variant: 'destructive' });
      setLoading(false);
      setLoadingMore(false);
    }
  }, [accounts.length, owner, toast]);
  
  React.useEffect(() => {
    const debouncedSearch = setTimeout(() => {
      fetchAccounts(false, searchTerm);
    }, 500);

    return () => clearTimeout(debouncedSearch);
  // We only want to run this when searchTerm changes, fetchAccounts is memoized
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleShowMore = () => {
      if(hasMore) {
          fetchAccounts(true, searchTerm);
      }
  }
  
  const handleCardClick = (id: string) => {
    router.push(`/accounts/${id}`);
  };

  const handleSyncPosts = async (account: Account) => {
    if (!account) return;
    setSyncingAccountId(account.id);
    try {
        let result;
        if (account.platform === 'Facebook') {
            result = await syncFacebookPostsAction(account.id);
        } else if (account.platform === 'LinkedIn') {
            result = await syncLinkedInPostsAction(account.id);
        } else {
             toast({ title: 'Sync Not Available', description: `Post syncing is not yet implemented for ${account.platform}.` });
             setSyncingAccountId(null);
             return;
        }
        
        if (result.success) {
            toast({
                title: 'Sync Complete',
                description: `${result.postsSynced} new posts were synced for this account.`,
            });
            setAccounts(prevAccounts => prevAccounts.map(acc => 
                acc.id === account.id ? { ...acc, lastSyncedAt: new Date().toISOString() } : acc
            ));
        } else {
            throw new Error(result.error || 'Unknown error during sync.');
        }
    } catch(error: any) {
        toast({
            title: 'Sync Failed',
            description: error.message,
            variant: 'destructive',
        });
    } finally {
        setSyncingAccountId(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    setDeletingAccountId(accountId);
    const result = await disconnectAccountAction(accountId);
    if(result.success) {
      setAccounts(prev => prev.filter(acc => acc.id !== accountId));
      toast({ title: "Account disconnected" });
    } else {
      toast({ title: "Failed to disconnect", description: result.error, variant: 'destructive'});
    }
    setDeletingAccountId(null);
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Connected Accounts</h1>
          <p className="text-muted-foreground">Manage your connected social media accounts.</p>
        </div>
      </div>
      
       <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search by name..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
            {Array.from({length: 3}).map((_, i) => (
                <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                           <div className="h-10 w-10 rounded-full bg-muted"></div>
                           <div>
                               <div className="h-5 w-24 rounded-md bg-muted"></div>
                               <div className="h-4 w-16 mt-1 rounded-md bg-muted"></div>
                           </div>
                       </div>
                       <div className="h-8 w-24 rounded-md bg-muted"></div>
                    </CardContent>
                </Card>
            ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
            <Card
                key="add-new-account"
                className="hover:shadow-md transition-shadow cursor-pointer border-dashed border-2 hover:border-primary"
                onClick={() => router.push('/accounts/add')}
            >
                <CardContent className="p-4 flex items-center justify-center text-center h-full min-h-[110px]">
                    <div className="flex items-center gap-4">
                        <PlusCircle className="h-8 w-8 text-muted-foreground" />
                        <div>
                            <h3 className="font-bold text-lg">Connect New Account</h3>
                            <p className="text-sm text-muted-foreground">Add a new social profile to manage.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {accounts.map((account) => (
            <Card key={account.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1" onClick={() => handleCardClick(account.id)}>
                        <div className="bg-muted p-3 rounded-full">
                            {account.icon}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{account.name}</h3>
                            <p className="text-sm text-muted-foreground">@{account.username}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                        <div className="text-xs text-muted-foreground text-left sm:text-right" onClick={() => handleCardClick(account.id)}>
                           <span>Last Synced: </span>
                            <span className="font-medium">{account.lastSyncedAt ? formatDistanceToNow(new Date(account.lastSyncedAt), { addSuffix: true }) : 'Never'}</span>
                        </div>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem onClick={() => router.push(`/accounts/${account.id}`)}>View Details</DropdownMenuItem>
                                
                                {account.platform === 'WhatsApp' && (
                                  <DropdownMenuItem onClick={() => router.push(`/accounts/${account.id}/edit`)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Configuration
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem onClick={() => handleSyncPosts(account)} disabled={syncingAccountId === account.id}>
                                    {syncingAccountId === account.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4" />}
                                    Sync Posts
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />
                                
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem
                                            className="text-destructive"
                                            onSelect={(e) => e.preventDefault()}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Disconnect
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will disconnect the account <span className="font-bold">{account.name}</span> from Neup.Socials. You may lose access to its data. This action cannot be undone.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            className="bg-destructive hover:bg-destructive/90"
                                            onClick={() => handleDisconnect(account.id)}
                                            disabled={deletingAccountId === account.id}
                                        >
                                            {deletingAccountId === account.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            Disconnect
                                        </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardContent>
            </Card>
            ))}
        </div>
      )}
      
      {hasMore && !loading && (
        <div className="text-center mt-6">
          <Button onClick={handleShowMore} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Show More
          </Button>
        </div>
      )}
    </div>
  );
}
