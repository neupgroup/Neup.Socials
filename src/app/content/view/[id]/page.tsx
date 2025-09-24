
'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash, ArrowLeft, Loader2, Repeat } from 'lucide-react';
import { doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { repostAction } from '@/actions/content/repost';
import { PublicationStatus } from '@/components/publication-status';

type Post = {
  id: string;
  content: string;
  status: 'Published' | 'Scheduled' | 'Draft';
  platforms: string[]; // Keep for display
  accountIds: string[];
  scheduledAt: string;
  publishedAt: string;
  author: string;
  mediaUrls: string[];
};

export default function ViewContentPage() {
  const params = useParams();
  const id = params.id as string;
  const [post, setPost] = React.useState<Post | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    if (!id) return;
    const fetchPost = async () => {
      setIsLoading(true);
      const docRef = doc(db, 'content', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setPost({
          id: docSnap.id,
          content: data.content,
          status: data.status,
          platforms: data.platforms || [],
          accountIds: data.accountIds || [],
          author: data.author,
          mediaUrls: data.mediaUrls || (data.mediaUrl ? [data.mediaUrl] : []),
          scheduledAt: data.scheduledAt ? format(data.scheduledAt.toDate(), 'PPpp') : '-',
          publishedAt: data.publishedAt ? format(data.publishedAt.toDate(), 'PPpp') : '-',
        });
      } else {
        toast({ title: 'Post not found', variant: 'destructive' });
        router.push('/content');
      }
      setIsLoading(false);
    };

    fetchPost();
  }, [id, router, toast]);

  const handleDelete = async () => {
    if (!post) return;
    if (window.confirm('Are you sure you want to delete this post and all its scheduled/published instances?')) {
      setIsProcessing(true);
      try {
        await deleteDoc(doc(db, 'content', post.id));
        toast({ title: 'Post deleted successfully' });
        router.push('/content');
      } catch (error) {
        toast({ title: 'Failed to delete post', variant: 'destructive' });
        setIsProcessing(false);
      }
    }
  };
  
  const handleCancelSchedule = async () => {
      if (!post || post.status !== 'Scheduled') return;
       if (window.confirm('Are you sure you want to cancel the schedule and move this post to drafts?')) {
           setIsProcessing(true);
           try {
                const docRef = doc(db, 'content', id);
                await updateDoc(docRef, {
                    status: 'Draft',
                    scheduledAt: null,
                });
                toast({ title: 'Schedule cancelled' });
                // Re-fetch post data to update UI
                const docSnap = await getDoc(docRef);
                 const data = docSnap.data();
                 if(data) {
                    setPost(prev => prev ? { ...prev, status: 'Draft', scheduledAt: '-' } : null);
                 }
           } catch (error) {
               toast({ title: 'Failed to cancel schedule', variant: 'destructive' });
           } finally {
               setIsProcessing(false);
           }
       }
  };

  const handleRepost = async () => {
    if (!post) return;
    setIsProcessing(true);
    try {
        const result = await repostAction(post.id);
        if (result.success && result.newPostId) {
            toast({ title: 'Post duplicated!', description: 'Redirecting to schedule the new post...' });
            router.push(`/content/edit/${result.newPostId}/platforms`);
        } else {
            throw new Error(result.error || 'Failed to create a repost.');
        }
    } catch (error: any) {
        toast({
            title: 'Could not create repost',
            description: error.message,
            variant: 'destructive',
        });
        setIsProcessing(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) {
    return (
        <div className="text-center">
            <p>Post not found.</p>
            <Button asChild className="mt-4">
                <Link href="/content">Go to Dashboard</Link>
            </Button>
        </div>
    );
  }
  
  const isPublished = post.status === 'Published';
  
  const getFullMediaUrl = (url: string) => {
    return url && !url.startsWith('http') ? `https://neupgroup.com${url}` : url;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon" disabled={isProcessing}>
          <Link href="/content">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">View Post Details</h1>
          <div className="text-muted-foreground flex items-center gap-2">
            Status:
            <Badge variant={isPublished ? 'default' : (post.status === 'Scheduled' ? 'secondary' : 'outline')}>{post.status}</Badge>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{post.content}</p>
                {post.mediaUrls && post.mediaUrls.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {post.mediaUrls.map((url, index) => (
                           <a href={getFullMediaUrl(url)} target="_blank" rel="noopener noreferrer" key={index}>
                             <Image src={getFullMediaUrl(url)} alt={`Post media ${index + 1}`} className="rounded-lg w-full aspect-square object-cover" width="200" height="200" />
                           </a>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>

        {post.accountIds && post.accountIds.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle>Publication Status</CardTitle>
                    <p className="text-muted-foreground">Status of this post on each platform.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <PublicationStatus 
                        accountIds={post.accountIds} 
                        postStatus={post.status} 
                        publishedAt={post.publishedAt}
                        scheduledAt={post.scheduledAt}
                        postId={post.id}
                    />
                </CardContent>
            </Card>
        )}
        
        <Card>
            <CardHeader>
                <CardTitle>Global Actions</CardTitle>
                <p className="text-muted-foreground">These actions affect the entire post across all platforms.</p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
               {!isPublished && (
                 <>
                    <Button asChild disabled={isProcessing}>
                        <Link href={`/content/edit/${id}`}><Edit className="mr-2 h-4 w-4"/> Edit Post</Link>
                    </Button>
                    {post.status === 'Scheduled' && (
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
                     Delete Entire Post
                </Button>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
