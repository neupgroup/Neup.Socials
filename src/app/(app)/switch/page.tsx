
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Twitter, Facebook, Linkedin, Instagram, MoreHorizontal, Loader2, Search, RefreshCw, Switch } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, formatDistanceToNow } from 'date-fns';
import { collection, query, where, getDocs, onSnapshot, orderBy, limit, startAfter, DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { syncPostsAction as syncFacebookPostsAction } from '@/actions/facebook/sync-posts';
import { syncLinkedInPostsAction } from '@/actions/linkedin/sync-posts';

type Account = {
  id: string;
  platform: string;
  username: string;
  name?: string;
  connectedOn: string;
  lastSyncedAt?: Timestamp;
  status: string;
  icon: React.ReactNode;
  owner: string;
};

const PlatformIcon = ({ platform }: { platform: string }) => {
    switch(platform) {
        case 'Twitter': return <Twitter className="h-5 w-5 text-blue-400" />;
        case 'LinkedIn': return <Linkedin className="h-5 w-5 text-blue-700" />;
        case 'Facebook': return <Facebook className="h-5 w-5 text-blue-600" />;
        case 'Instagram': return <Instagram className="h-5 w-5 text-pink-500" />;
        default: return null;
    }
}

const PAGE_SIZE = 10;

export default function SwitchAccountPage() {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [lastVisible, setLastVisible] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [syncingAccountId, setSyncingAccountId] = React.useState<string | null>(null);
  
  const { toast } = useToast();
  const owner = 'neupkishor'; // This should be dynamic in a real app
  const router = useRouter();

  const fetchAccounts = React.useCallback(async (loadMore = false, search = '') => {
    if(!loadMore) setLoading(true);
    else setLoadingMore(true);

    try {
      let q = query(
        collection(db, 'connected_accounts'),
        where('owner', '==', owner),
        orderBy('connectedOn', 'desc'),
        limit(PAGE_SIZE)
      );

      if (search) {
        q = query(
          collection(db, 'connected_accounts'),
          where('owner', '==', owner),
          where('name', '>=', search),
          where('name', '<=', search + '\uf8ff'),
          orderBy('name'),
          limit(PAGE_SIZE)
        );
      }
      
      if (loadMore && lastVisible) {
        const baseQuery = search 
            ? query(collection(db, 'connected_accounts'), where('owner', '==', owner), where('name', '>=', search), where('name', '<=', search + '\uf8ff'), orderBy('name'))
            : query(collection(db, 'connected_accounts'), where('owner', '==', owner), orderBy('connectedOn', 'desc'));

        q = query(baseQuery, startAfter(lastVisible), limit(PAGE_SIZE));
      }

      const documentSnapshots = await getDocs(q);
      const newAccounts = documentSnapshots.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            platform: data.platform,
            username: data.username,
            name: data.name,
            connectedOn: data.connectedOn ? format(data.connectedOn.toDate(), 'yyyy-MM-dd') : '-',
            lastSyncedAt: data.lastSyncedAt,
            status: data.status,
            owner: data.owner,
            icon: <PlatformIcon platform={data.platform} />,
          } as Account;
        });

      setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
      setHasMore(newAccounts.length === PAGE_SIZE);
      setAccounts(prev => loadMore ? [...prev, ...newAccounts] : newAccounts);
      setLoading(false);
      setLoadingMore(false);
    } catch (error) {
      console.error("Error fetching accounts: ", error);
      toast({ title: 'Error fetching accounts', variant: 'destructive' });
      setLoading(false);
      setLoadingMore(false);
    }
  }, [owner, toast, lastVisible]);
  
  React.useEffect(() => {
    const debouncedSearch = setTimeout(() => {
      setLastVisible(null); // Reset pagination on new search
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
            // Manually update the lastSyncedAt time on the client to give immediate feedback
            setAccounts(prevAccounts => prevAccounts.map(acc => 
                acc.id === account.id ? { ...acc, lastSyncedAt: new Timestamp(Date.now() / 1000, 0) } : acc
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Switch className="h-8 w-8" /> Switch Account</h1>
          <p className="text-muted-foreground">Select an account to view its details and content.</p>
        </div>
        <Button asChild>
            <Link href="/accounts/add">
                <PlusCircle className="mr-2 h-4 w-4" />
                Connect New Account
            </Link>
        </Button>
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
            {accounts.map((account) => (
            <Card key={account.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleCardClick(account.id)}>
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="bg-muted p-3 rounded-full">
                            {account.icon}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{account.name}</h3>
                            <p className="text-sm text-muted-foreground">@{account.username}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                        <div className="text-xs text-muted-foreground text-left sm:text-right">
                           <span>Last Synced: </span>
                            <span className="font-medium">{account.lastSyncedAt ? formatDistanceToNow(account.lastSyncedAt.toDate(), { addSuffix: true }) : 'Never'}</span>
                        </div>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSyncPosts(account); }} disabled={syncingAccountId === account.id}>
                                    {syncingAccountId === account.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4" />}
                                    Sync Posts
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/accounts/${account.id}`) }}>View Details</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">Disconnect</DropdownMenuItem>
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
