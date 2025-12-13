
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Loader2, Search, Twitter, Facebook, Linkedin, Instagram, MoreHorizontal } from 'lucide-react';
import { collection, getDocs, orderBy, query, limit, startAfter, where, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Post = {
  id: string;
  message: string;
  platform: string;
  createdOn: any; // Firestore Timestamp
  postLink: string;
  postCollectionId: string;
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


const PAGE_SIZE = 15;

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
        collection(db, 'posts'),
        orderBy('createdOn', 'desc'),
        limit(PAGE_SIZE)
      );

      if (search) {
        q = query(
          collection(db, 'posts'),
          where('message', '>=', search),
          where('message', '<=', search + '\uf8ff'),
          orderBy('message'),
          limit(PAGE_SIZE)
        );
      }

      if (loadMore && lastVisible) {
        const baseQuery = search 
            ? query(collection(db, 'posts'), where('message', '>=', search), where('message', '<=', search + '\uf8ff'), orderBy('message'))
            : query(collection(db, 'posts'), orderBy('createdOn', 'desc'));

        q = query(baseQuery, startAfter(lastVisible), limit(PAGE_SIZE));
      }

      const documentSnapshots = await getDocs(q);
      const fetchedData = documentSnapshots.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          message: data.message,
          platform: data.platform,
          createdOn: data.createdOn,
          postLink: data.postLink,
          postCollectionId: data.postCollectionId,
        } as Post;
      });

      setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
      setHasMore(fetchedData.length === PAGE_SIZE);
      setPosts(prev => loadMore ? [...prev, ...fetchedData] : fetchedData);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);


  const handleCardClick = (id: string) => {
    router.push(`/content/${id}`);
  };

  const handleShowMore = () => {
      if(hasMore) {
          fetchPosts(true, searchTerm);
      }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Content Feed</h1>
          <p className="text-muted-foreground">A unified feed of all your published posts.</p>
        </div>
      </div>
      
      <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
              placeholder="Search content..." 
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
                               <div className="h-5 w-40 rounded-md bg-muted"></div>
                               <div className="h-4 w-24 mt-1 rounded-md bg-muted"></div>
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
                key="add-new-post"
                className="hover:shadow-md transition-shadow cursor-pointer border-dashed border-2 hover:border-primary"
                onClick={() => router.push('/content/create')}
            >
                <CardContent className="p-4 flex items-center justify-center text-center h-full min-h-[110px]">
                    <div className="flex items-center gap-4">
                        <PlusCircle className="h-8 w-8 text-muted-foreground" />
                        <div>
                            <h3 className="font-bold text-lg">Create New Post</h3>
                            <p className="text-sm text-muted-foreground">Draft a new post collection for your channels.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {posts.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                        No posts found for your search term.
                    </CardContent>
                </Card>
            ) : (
                posts.map((post) => (
                    <Card key={post.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleCardClick(post.id)}>
                        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 overflow-hidden">
                                <div className="bg-muted p-3 rounded-full">
                                    <PlatformIcon platform={post.platform} />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="font-medium truncate">{post.message}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Published {post.createdOn ? formatDistanceToNow(post.createdOn.toDate(), { addSuffix: true }) : 'on an unknown date'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/content/${post.id}`) }}>View Details</DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/content/collection/${post.postCollectionId}`) }}>View Collection</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
      )}
      
       {!loading && hasMore && (
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
