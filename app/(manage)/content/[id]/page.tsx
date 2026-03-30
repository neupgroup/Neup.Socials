
'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Edit, Trash2, ExternalLink, ThumbsUp, MessageSquare, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getPostAnalyticsAction } from '@/actions/facebook/post-insights';
import { deletePostAction, getPostAction, getPostCollectionAction } from '@/actions/db';

type Post = {
  id: string;
  postCollectionId: string | null;
  accountId: string | null;
  platform: string | null;
  platformPostId: string | null;
  message: string | null;
  postLink: string | null;
  createdOn: string | null;
  mediaUrls?: string[];
};

const analyticsFetcher = (postId: string) => getPostAnalyticsAction(postId);

const PostAnalytics = ({ postId }: { postId: string }) => {
    const { data, error, isLoading } = useSWR(postId ? `${postId}-analytics` : null, () => analyticsFetcher(postId));

    if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
    if (error || !data?.success || !data.analytics) return <p className="text-sm text-destructive">Analytics not available.</p>;

    const { likes, comments, shares } = data.analytics;

    return (
        <div className="flex flex-wrap justify-around p-4 border rounded-lg bg-muted/50 gap-4">
            <div className="text-center">
                <p className="text-sm text-muted-foreground">Likes</p>
                <p className="text-2xl font-bold flex items-center justify-center gap-2"><ThumbsUp className="h-5 w-5 text-blue-500" /> {likes}</p>
            </div>
            <div className="text-center">
                <p className="text-sm text-muted-foreground">Comments</p>
                <p className="text-2xl font-bold flex items-center justify-center gap-2"><MessageSquare className="h-5 w-5 text-gray-500" /> {comments}</p>
            </div>
            <div className="text-center">
                <p className="text-sm text-muted-foreground">Shares</p>
                <p className="text-2xl font-bold flex items-center justify-center gap-2"><Share2 className="h-5 w-5 text-green-500" /> {shares}</p>
            </div>
        </div>
    );
};

export default function ViewPostPage() {
  const params = useParams();
  const id = params.id as string;
  const [post, setPost] = React.useState<Post | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    if (!id) return;
    const fetchPost = async () => {
      setLoading(true);
      const postData = await getPostAction(id);

      if (postData) {
        
        if (!postData.mediaUrls && postData.postCollectionId) {
            const collectionData = await getPostCollectionAction(postData.postCollectionId);
            if (collectionData) {
                postData.mediaUrls = collectionData.mediaUrls || [];
            }
        }
        setPost(postData);
      } else {
        toast({ title: 'Post not found', variant: 'destructive' });
        router.push('/content');
      }
      setLoading(false);
    };
    fetchPost();
  }, [id, router, toast]);

  const handleDelete = async () => {
    if (!post) return;
    if (window.confirm('Are you sure you want to delete this post? This action cannot be undone and may not remove the post from the social platform.')) {
        setIsProcessing(true);
        try {
            await deletePostAction(post.id);
            toast({ title: 'Post deleted successfully from dashboard.' });
            router.push(`/content/collection/${post.postCollectionId}`);
        } catch (error: any) {
            toast({ title: 'Failed to delete post', description: error.message, variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    }
  };

  const getFullMediaUrl = (url: string) => {
    return url && !url.startsWith('http') ? `https://neupgroup.com${url}` : url;
  }

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!post) {
    return <div className="text-center">Post not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon" disabled={isProcessing}>
                <Link href={post.postCollectionId ? `/content/collection/${post.postCollectionId}` : '/content'}>
                    <ArrowLeft />
                </Link>
            </Button>
            <div>
                <h1 className="text-3xl font-bold">Post Details</h1>
                <p className="text-muted-foreground">Platform: <Badge>{post.platform}</Badge></p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Button asChild variant="outline" disabled={isProcessing}>
                <Link href={`/content/edit/${post.postCollectionId}`}><Edit className="mr-2 h-4 w-4"/> Edit Collection</Link>
            </Button>
             <Button variant="destructive" onClick={handleDelete} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4"/>}
                Delete
            </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Published Content</CardTitle>
          <CardDescription>
            Published on {post.createdOn ? format(new Date(post.createdOn), 'PPpp') : 'N/A'}.
            {post.postLink ? (
              <a href={post.postLink} target="_blank" rel="noopener noreferrer" className="ml-2 text-sm text-primary hover:underline flex items-center gap-1">
                   View on {post.platform || 'platform'} <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap text-muted-foreground p-4 border rounded-lg bg-muted/20">{post.message}</p>
            
            {post.mediaUrls && post.mediaUrls.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {post.mediaUrls.map((url, index) => (
                       <a href={getFullMediaUrl(url)} target="_blank" rel="noopener noreferrer" key={index}>
                         <Image src={getFullMediaUrl(url)} alt={`Post media ${index + 1}`} className="rounded-lg w-full aspect-square object-cover" width="200" height="200" />
                       </a>
                    ))}
                </div>
            )}
        </CardContent>
      </Card>
      
      {post.platform === 'Facebook' && (
        <Card>
            <CardHeader>
                <CardTitle>Post Analytics</CardTitle>
                <CardDescription>Performance metrics for this specific post.</CardDescription>
            </CardHeader>
            <CardContent>
                <PostAnalytics postId={post.id} />
            </CardContent>
        </Card>
      )}

    </div>
  );
}
