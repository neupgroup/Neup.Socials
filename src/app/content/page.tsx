
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Loader2, Search } from 'lucide-react';
import { collection, getDocs, orderBy, query, limit, startAfter, where, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';


type Post = {
  id: string;
  content: string;
  status: 'Published' | 'Scheduled' | 'Draft';
  platforms: string[];
  scheduledAt: string;
};

const PAGE_SIZE = 10;

export default function ContentDashboardPage() {
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [lastVisible, setLastVisible] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  
  const router = useRouter();

  const fetchPosts = React.useCallback(async (loadMore = false, search = '') => {
    if (!loadMore) setLoading(true);
    else setLoadingMore(true);

    try {
      let q = query(
        collection(db, 'content'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );

      if (search) {
        q = query(
          collection(db, 'content'),
          where('content', '>=', search),
          where('content', '<=', search + '\uf8ff'),
          orderBy('content'),
          limit(PAGE_SIZE)
        );
      }

      if (loadMore && lastVisible) {
        const baseQuery = search 
            ? query(collection(db, 'content'), where('content', '>=', search), where('content', '<=', search + '\uf8ff'), orderBy('content'))
            : query(collection(db, 'content'), orderBy('createdAt', 'desc'));

        q = query(baseQuery, startAfter(lastVisible), limit(PAGE_SIZE));
      }

      const documentSnapshots = await getDocs(q);
      const fetchedPosts = documentSnapshots.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          content: data.content,
          status: data.status,
          platforms: data.platforms || [],
          scheduledAt: data.scheduledAt ? format(data.scheduledAt.toDate(), 'yyyy-MM-dd') : '-',
        } as Post;
      });

      setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
      setHasMore(fetchedPosts.length === PAGE_SIZE);
      setPosts(prev => loadMore ? [...prev, ...fetchedPosts] : fetchedPosts);
    } catch (error) {
      console.error("Error fetching posts: ", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [lastVisible]);

  React.useEffect(() => {
    const debouncedSearch = setTimeout(() => {
      setLastVisible(null);
      fetchPosts(false, searchTerm);
    }, 500);

    return () => clearTimeout(debouncedSearch);
  // We only want to run this when searchTerm changes, fetchPosts is memoized
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);


  const handleRowClick = (postId: string) => {
    router.push(`/content/view/${postId}`);
  };

  const handleShowMore = () => {
      if(hasMore) {
          fetchPosts(true, searchTerm);
      }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Content Dashboard</h1>
          <p className="text-muted-foreground">Manage all your posts in one place.</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input 
                    placeholder="Search content..." 
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Button asChild>
            <Link href="/content/create">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Post
            </Link>
            </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Content</TableHead>
                <TableHead>Platforms</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                    No posts found.
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((post) => (
                  <TableRow 
                    key={post.id} 
                    onClick={() => handleRowClick(post.id)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium max-w-sm truncate">{post.content}</TableCell>
                    <TableCell>{post.platforms.join(', ')}</TableCell>
                    <TableCell>
                      <Badge variant={post.status === 'Published' ? 'default' : (post.status === 'Scheduled' ? 'secondary' : 'outline')}>
                        {post.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{post.scheduledAt}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       {hasMore && (
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
