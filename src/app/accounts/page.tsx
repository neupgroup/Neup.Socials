
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Twitter, Facebook, Linkedin, Instagram, MoreHorizontal, Loader2, Search, RefreshCw } from 'lucide-react';
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
import { syncPostsAction } from '@/actions/facebook/sync-posts';

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

export default function AccountsPage() {
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
        q = query(
          collection(db, 'connected_accounts'),
          where('owner', '==', owner),
          orderBy('connectedOn', 'desc'),
          startAfter(lastVisible),
          limit(PAGE_SIZE)
        );
         if (search) {
            q = query(
              collection(db, 'connected_accounts'),
              where('owner', '==', owner),
              where('name', '>=', search),
              where('name', '<=', search + '\uf8ff'),
              orderBy('name'),
              startAfter(lastVisible),
              limit(PAGE_SIZE)
            );
        }
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newAccounts = snapshot.docs.map(doc => {
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

        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(newAccounts.length === PAGE_SIZE);
        setAccounts(prev => loadMore ? [...prev, ...newAccounts] : newAccounts);
        setLoading(false);
        setLoadingMore(false);
      });

      return unsubscribe;

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
  
  const handleRowClick = (id: string) => {
    router.push(`/accounts/${id}`);
  };

  const handleSyncPosts = async (accountId: string) => {
    setSyncingAccountId(accountId);
    try {
        const result = await syncPostsAction(accountId);
        if (result.success) {
            toast({
                title: 'Sync Complete',
                description: `${result.postsSynced} new posts were synced for this account.`,
            });
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
          <h1 className="text-3xl font-bold">Connected Accounts</h1>
          <p className="text-muted-foreground">Manage your connected social media accounts.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input 
                    placeholder="Search by name..." 
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Button asChild>
            <Link href="/accounts/add">
                <PlusCircle className="mr-2 h-4 w-4" />
                Connect New Account
            </Link>
            </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {loading ? (
                    <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </TableCell>
                    </TableRow>
                ) : accounts.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                        No accounts found.
                    </TableCell>
                    </TableRow>
                ) : (
                    accounts.map((account) => (
                    <TableRow key={account.id} onClick={() => handleRowClick(account.id)} className="cursor-pointer">
                        <TableCell>
                        <div className="flex items-center gap-3">
                            {account.icon}
                            <span className="font-medium">{account.platform}</span>
                        </div>
                        </TableCell>
                        <TableCell>{account.name}</TableCell>
                        <TableCell>
                        <Badge variant={account.status === 'Active' ? 'default' : 'destructive'}>{account.status}</Badge>
                        </TableCell>
                    </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {hasMore && !loading && (
        <div className="text-center">
          <Button onClick={handleShowMore} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Show More
          </Button>
        </div>
      )}
    </div>
  );
}
