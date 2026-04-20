
'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash, ArrowLeft, Loader2, Repeat, Link2 } from 'lucide-react';
import { useToast } from '@/core/hooks/use-toast';
import { format } from 'date-fns';
import { repostAction } from '@/services/feed/repost';
import { PublicationStatus } from '@/components/publication-status';
import {
  cancelScheduledPostCollectionAction,
  deletePostCollectionAction,
  getPostCollectionAction,
  getPostCollectionPostsAction,
} from '@/services/db';

type PostCollection = {
  id: string;
  content: string;
  status: string;
  platforms: string[];
  accountIds: string[];
  scheduledAt: string;
  publishedAt: string;
  author: string | null;
  mediaUrls: string[];
  postsId: string[];
};

type Post = {
    id: string;
    platformPostId: string | null;
    accountId: string | null;
    platform: string | null;
    postLink: string | null;
    createdOn: string | null;
};


export default function ViewContentCollectionPage() {
  const params = useParams();
  const id = params.id as string; // This is postCollectionId
  const [postCollection, setPostCollection] = React.useState<PostCollection | null>(null);
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    if (!id) return;
    const fetchPostCollection = async () => {
      setIsLoading(true);
      const data = await getPostCollectionAction(id);

      if (data) {
        const pc = {
          ...data,
          scheduledAt: data.scheduledAt ? format(new Date(data.scheduledAt), 'PPpp') : '-',
          publishedAt: data.publishedAt ? format(new Date(data.publishedAt), 'PPpp') : '-',
        };
        setPostCollection(pc);
        
        if (pc.postsId && pc.postsId.length > 0) {
            const fetchedPosts = await getPostCollectionPostsAction(pc.postsId);
            setPosts(fetchedPosts as Post[]);
        }

      } else {
        toast({ title: 'Post Collection not found', variant: 'destructive' });
        router.push('/feed');
      }
      setIsLoading(false);
    };

    fetchPostCollection();
  }, [id, router, toast]);

  const handleDelete = async () => {
    if (!postCollection) return;
    if (window.confirm('Are you sure you want to delete this post collection and all its scheduled/published instances?')) {
      setIsProcessing(true);
      try {
        await deletePostCollectionAction(postCollection.id);
        toast({ title: 'Post collection deleted successfully' });
        router.push('/feed');
      } catch (error) {
        toast({ title: 'Failed to delete post collection', variant: 'destructive' });
        setIsProcessing(false);
      }
    }
  };
  
  const handleCancelSchedule = async () => {
      if (!postCollection || postCollection.status !== 'Scheduled') return;
      if (window.confirm('Are you sure you want to cancel the schedule and move this post to drafts?')) {
           setIsProcessing(true);
           try {
                await cancelScheduledPostCollectionAction(id);
                toast({ title: 'Schedule cancelled' });
                 setPostCollection(prev => prev ? { ...prev, status: 'Draft', scheduledAt: '-' } : null);
           } catch (error) {
               toast({ title: 'Failed to cancel schedule', variant: 'destructive' });
           } finally {
               setIsProcessing(false);
           }
       }
  };

  const handleRepost = async () => {
    if (!postCollection) return;
    setIsProcessing(true);
    // Note: repostAction would need to be updated to handle postCollections
    toast({ title: 'Coming Soon!', description: 'Reposting functionality is being updated for the new data model.'});
    setIsProcessing(false);
    // try {
    //     const result = await repostAction(postCollection.id);
    //     if (result.success && result.newPostId) {
    //         toast({ title: 'Post duplicated!', description: 'Redirecting to schedule the new post...' });
    //         router.push(`/feed/edit/${result.newPostId}/platforms`);
    //     } else {
    //         throw new Error(result.error || 'Failed to create a repost.');
    //     }
    // } catch (error: any) {
    //     toast({
    //         title: 'Could not create repost',
    //         description: error.message,
    //         variant: 'destructive',
    //     });
    //     setIsProcessing(false);
    // }
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!postCollection) {
    return (
        <div className="text-center">
            <p>Post Collection not found.</p>
            <Button asChild className="mt-4">
                <Link href="/feed">Go to Dashboard</Link>
            </Button>
        </div>
    );
  }
  
  const isPublished = postCollection.status === 'Published';
  
  const getFullMediaUrl = (url: string) => {
    return url && !url.startsWith('http') ? `https://neupgroup.com${url}` : url;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon" disabled={isProcessing}>
          <Link href="/feed">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">View Post Collection Details</h1>
          <div className="text-muted-foreground flex items-center gap-2">
            Status:
            <Badge variant={isPublished ? 'default' : (postCollection.status === 'Scheduled' ? 'secondary' : 'outline')}>{postCollection.status}</Badge>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Base Content</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{postCollection.content}</p>
                {postCollection.mediaUrls && postCollection.mediaUrls.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {postCollection.mediaUrls.map((url, index) => (
                           <a href={getFullMediaUrl(url)} target="_blank" rel="noopener noreferrer" key={index}>
                             <Image src={getFullMediaUrl(url)} alt={`Post media ${index + 1}`} className="rounded-lg w-full aspect-square object-cover" width="200" height="200" />
                           </a>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>

        {postCollection.accountIds && postCollection.accountIds.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle>Publication Status</CardTitle>
                    <p className="text-muted-foreground">Status of this post on each selected account.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <PublicationStatus 
                        accountIds={postCollection.accountIds}
                        posts={posts}
                        postStatus={postCollection.status} 
                        publishedAt={postCollection.publishedAt}
                        scheduledAt={postCollection.scheduledAt}
                        postCollectionId={postCollection.id}
                    />
                </CardContent>
            </Card>
        )}
        
        <Card>
            <CardHeader>
                <CardTitle>Global Actions</CardTitle>
                <p className="text-muted-foreground">These actions affect the entire post collection.</p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
               {!isPublished && (
                 <>
                    <Button asChild disabled={isProcessing}>
                        <Link href={`/feed/edit/${id}`}><Edit className="mr-2 h-4 w-4"/> Edit Collection</Link>
                    </Button>
                    {postCollection.status === 'Scheduled' && (
                        <Button variant="outline" onClick={handleCancelSchedule} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Cancel Schedule
                        </Button>
                    )}
                 </>
               )}
               <Button variant="secondary" onClick={handleRepost} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Repeat className="mr-2 h-4 w-4"/>}
                    Repost
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash className="mr-2 h-4 w-4"/>}
                     Delete Collection
                </Button>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
