
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Users, ThumbsUp, Share2, ExternalLink, Twitter, Facebook, Linkedin, Instagram, RefreshCw, Heart, Laugh, Angry, Droplet, Annoyed, History } from 'lucide-react';
import { doc, getDoc, collection, query, where, orderBy, limit, startAfter, getDocs, DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { getPageInsightsAction } from '@/actions/facebook/insights';
import { format } from 'date-fns';
import { logError } from '@/lib/error-logging';
import { syncPostsAction } from '@/actions/facebook/sync-posts';

type Account = {
  id: string;
  platform: string;
  name: string;
  username: string;
  status: string;
  platformId: string;
};

type Post = {
  id: string;
  message: string;
  createdOn: Timestamp;
  postLink: string;
};

type InsightData = {
  totalFollowers?: number;
  totalEngagement?: number;
  totalReach?: number;
  reactions?: { [key: string]: number };
};

const PAGE_SIZE = 10;

const PlatformIcon = ({ platform }: { platform: string }) => {
    switch(platform) {
        case 'Twitter': return <Twitter className="h-8 w-8 text-blue-400" />;
        case 'LinkedIn': return <Linkedin className="h-8 w-8 text-blue-700" />;
        case 'Facebook': return <Facebook className="h-8 w-8 text-blue-600" />;
        case 'Instagram': return <Instagram className="h-8 w-8 text-pink-500" />;
        default: return null;
    }
}

const ReactionIcon = ({ reaction }: { reaction: string }) => {
    switch(reaction.toLowerCase()) {
        case 'like': return <ThumbsUp className="h-4 w-4 text-blue-500" />;
        case 'love': return <Heart className="h-4 w-4 text-red-500" />;
        case 'haha': return <Laugh className="h-4 w-4 text-yellow-500" />;
        case 'wow': return <Annoyed className="h-4 w-4 text-yellow-400" />;
        case 'sad': return <Droplet className="h-4 w-4 text-blue-300" />;
        case 'angry': return <Angry className="h-4 w-4 text-red-700" />;
        default: return null;
    }
};

export default function AccountDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { toast } = useToast();

  const [account, setAccount] = React.useState<Account | null>(null);
  const [insights, setInsights] = React.useState<InsightData | null>(null);
  const [posts, setPosts] = React.useState<Post[]>([]);
  
  const [loading, setLoading] = React.useState(true);
  const [loadingMorePosts, setLoadingMorePosts] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const [lastVisible, setLastVisible] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = React.useState(true);

  const fetchPosts = React.useCallback(async (loadMore = false) => {
    if (!id) return;
    
    if (loadMore) {
        setLoadingMorePosts(true);
    }

    try {
      let q = query(
        collection(db, 'posts'),
        where('accountId', '==', id),
        orderBy('createdOn', 'desc'),
        limit(PAGE_SIZE)
      );

      if (loadMore && lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      const documentSnapshots = await getDocs(q);
      const newPosts = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));

      setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
      setHasMore(newPosts.length === PAGE_SIZE);
      setPosts(prev => loadMore ? [...prev, ...newPosts] : newPosts);

    } catch (error: any) {
        await logError({
            process: 'fetchPosts',
            location: 'AccountDetailPage',
            errorMessage: error.message,
            context: { accountId: id, trace: error.stack },
        });
        toast({ title: 'Failed to fetch posts', variant: 'destructive' });
    } finally {
      if (loadMore) {
        setLoadingMorePosts(false);
      }
    }
  }, [id, toast, lastVisible]);
  
  React.useEffect(() => {
    if (!id) {
        setLoading(false);
        return;
    };

    const fetchAccountDetails = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'connected_accounts', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const acc = { id: docSnap.id, ...data } as Account;
          setAccount(acc);

          if (acc.platform === 'Facebook') {
            const insightsResult = await getPageInsightsAction(id);
            if (insightsResult.success && insightsResult.data) {
              setInsights(insightsResult.data);
            }
          }
          
          await fetchPosts();

        } else {
          toast({ title: 'Account not found', variant: 'destructive' });
          router.push('/accounts');
        }
      } catch (error) {
        toast({ title: 'Failed to fetch account details', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchAccountDetails();
  // The dependency array is intentionally kept simple to run once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router, toast]);

  const handleSyncPosts = async () => {
    if (!id) return;
    setIsSyncing(true);
    try {
        const result = await syncPostsAction(id);
        if (result.success) {
            toast({
                title: 'Sync Complete',
                description: `${result.postsSynced} new posts were synced.`,
            });
            // Reset pagination and fetch posts from the start
            setLastVisible(null);
            await fetchPosts();
        } else {
            throw new Error(result.error || 'Unknown error during sync.');
        }
    } catch(error: any) {
        await logError({
            process: 'handleSyncPosts',
            location: 'AccountDetailPage',
            errorMessage: error.message,
            context: { accountId: id }
        });
        toast({
            title: 'Sync Failed',
            description: error.message,
            variant: 'destructive',
        });
    } finally {
        setIsSyncing(false);
    }
  };

  const handleRefreshProfile = () => {
      toast({ title: 'Coming Soon!', description: 'This feature is not yet implemented.' });
  }

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (!account) {
    return <div className="text-center">Account not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
            <Link href="/accounts">
                <ArrowLeft />
            </Link>
            </Button>
            <div className="flex items-center gap-4">
                <PlatformIcon platform={account.platform} />
                <div>
                    <h1 className="text-3xl font-bold">{account.name}</h1>
                    <div className="text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span>@{account.username}</span>
                        <Badge variant="outline" className="font-mono">{account.platformId}</Badge>
                    </div>
                </div>
            </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <Button asChild variant="secondary">
                <Link href={`/accounts/${id}/fetch`}>
                    <History className="mr-2 h-4 w-4" />
                    View Sync History
                </Link>
            </Button>
            <Button variant="outline" onClick={handleSyncPosts} disabled={isSyncing}>
                {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4"/>}
                Sync Posts
            </Button>
             <Button variant="outline" onClick={handleRefreshProfile}>
                Refresh Profile
            </Button>
        </div>
      </div>

      {insights && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{insights.totalFollowers?.toLocaleString() || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Engagement</CardTitle>
              <ThumbsUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{insights.totalEngagement?.toLocaleString() || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{insights.totalReach?.toLocaleString() || 0}</div>
            </CardContent>
          </Card>
          {insights.reactions && (
             <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Reactions (30 days)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                        {Object.entries(insights.reactions).map(([type, count]) => (
                            <div key={type} className="flex flex-col items-center">
                                <ReactionIcon reaction={type} />
                                <span className="text-sm font-bold">{count}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Posts</CardTitle>
          <CardDescription>Posts published to this account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Content</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {posts.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No posts found for this account.</TableCell></TableRow>
                ) : (
                    posts.map(post => (
                    <TableRow key={post.id} className="cursor-pointer" onClick={() => router.push(`/content/${post.id}`)}>
                        <TableCell className="max-w-md truncate">{post.message}</TableCell>
                        <TableCell className="whitespace-nowrap">{format(post.createdOn.toDate(), 'yyyy-MM-dd HH:mm')}</TableCell>
                        <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                            <a href={post.postLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}><ExternalLink className="mr-2 h-4 w-4" /> View</a>
                        </Button>
                        </TableCell>
                    </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
          </div>
          {hasMore && (
            <div className="text-center mt-4">
              <Button onClick={() => fetchPosts(true)} disabled={loadingMorePosts}>
                {loadingMorePosts && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Show More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
