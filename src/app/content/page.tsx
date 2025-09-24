
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Loader2 } from 'lucide-react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';

type Post = {
  id: string;
  content: string;
  status: 'Published' | 'Scheduled' | 'Draft';
  platform: string;
  scheduledAt: string;
};

export default function ContentDashboardPage() {
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const postsCollection = collection(db, 'content');
        const q = query(postsCollection, orderBy('createdAt', 'desc'));
        const postsSnapshot = await getDocs(q);
        const postsList = postsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            content: data.content,
            status: data.status,
            platform: data.platforms.join(', '),
            scheduledAt: data.scheduledAt ? format(data.scheduledAt.toDate(), 'yyyy-MM-dd') : '-',
          } as Post;
        });
        setPosts(postsList);
      } catch (error) {
        console.error("Error fetching posts: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handleRowClick = (postId: string) => {
    router.push(`/content/view/${postId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Dashboard</h1>
          <p className="text-muted-foreground">Manage all your posts in one place.</p>
        </div>
        <Button asChild>
          <Link href="/content/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Post
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Content</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No posts found. Start by creating a new one!
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
                    <TableCell>{post.platform}</TableCell>
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
    </div>
  );
}
