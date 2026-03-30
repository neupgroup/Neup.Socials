
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, Clock, BarChart2, Loader2, FileText } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getPostCollectionAction } from '@/actions/db';

type PostCollection = {
  id: string;
  status: string;
  platforms: string[]; // Kept for display
  publishedAt?: string;
  scheduledAt?: string;
  analytics?: {
    likes: number;
    comments: number;
    shares: number;
    reach: number;
  }
};


export default function PostStatusPage() {
  const params = useParams();
  const id = params.id as string;
  const [postCollection, setPostCollection] = React.useState<PostCollection | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    if (!id) return;
    const fetchPostCollection = async () => {
      setLoading(true);
      const data = await getPostCollectionAction(id);

      if (data) {
        setPostCollection({
          id: data.id,
          status: data.status,
          platforms: data.platforms || [],
          publishedAt: data.publishedAt ? format(new Date(data.publishedAt), 'PPpp') : undefined,
          scheduledAt: data.scheduledAt ? format(new Date(data.scheduledAt), 'PPpp') : undefined,
          analytics: data.status === 'Published' ? { likes: 120, comments: 15, shares: 45, reach: 1500 } : undefined
        });
      } else {
        toast({ title: 'Post Collection not found', variant: 'destructive' });
        router.push('/content');
      }
      setLoading(false);
    };

    fetchPostCollection();
  }, [id, router, toast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!postCollection) {
    return <p className="text-center">Post Collection not found.</p>;
  }

  const isPublished = postCollection.status === 'Published';
  const isScheduled = postCollection.status === 'Scheduled';
  const progressValue = isPublished ? Math.floor(((postCollection.analytics?.likes || 0) / 200) * 100) : 0;
  const platformText = postCollection.platforms.join(', ');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
       <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/content">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
            <h1 className="text-3xl font-bold">Post Status</h1>
            <p className="text-muted-foreground">Check the status of your post collection ID: {id}</p>
        </div>
      </div>
        
        {isPublished && postCollection.analytics ? (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-6 w-6 text-green-500" />
                        <span>Published Successfully</span>
                    </CardTitle>
                    <CardDescription>
                        Your post went live on {platformText} at {postCollection.publishedAt}.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Likes</p>
                            <p className="text-2xl font-bold">{postCollection.analytics.likes}</p>
                        </div>
                         <div className="space-y-1 text-right">
                            <p className="text-sm font-medium text-muted-foreground">Comments</p>
                            <p className="text-2xl font-bold">{postCollection.analytics.comments}</p>
                        </div>
                         <div className="space-y-1 text-right">
                            <p className="text-sm font-medium text-muted-foreground">Shares</p>
                            <p className="text-2xl font-bold">{postCollection.analytics.shares}</p>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label>Reach: {postCollection.analytics.reach} users</Label>
                        <Progress value={progressValue} />
                    </div>
                    <Button asChild variant="secondary">
                        <Link href="/analytics"><BarChart2 className="mr-2 h-4 w-4"/> View Full Analytics</Link>
                    </Button>
                </CardContent>
            </Card>
        ) : isScheduled ? (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-6 w-6 text-blue-500" />
                        <span>Post is Scheduled</span>
                    </CardTitle>
                    <CardDescription>
                        This post is scheduled to be published on {platformText}.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-center py-10">
                    <p className="text-lg">Scheduled for:</p>
                    <p className="text-4xl font-bold text-primary">{postCollection.scheduledAt}</p>
                    <p className="text-muted-foreground">You can still edit or cancel this post before it goes live.</p>
                    <div className="flex justify-center gap-4 pt-4">
                        <Button asChild>
                            <Link href={`/content/edit/${id}`}>Edit Post</Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href={`/content/view/${id}`}>View Details</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        ) : (
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-6 w-6 text-yellow-500" />
                        <span>Post is a Draft</span>
                    </CardTitle>
                    <CardDescription>
                        This post is saved as a draft and has not been scheduled or published.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-center py-10">
                    <p className="text-muted-foreground">Complete the creation process to schedule or publish this post.</p>
                    <div className="flex justify-center gap-4 pt-4">
                        <Button asChild>
                            <Link href={`/content/edit/${id}/platforms`}>Continue Editing</Link>
                        </Button>
                         <Button asChild variant="outline">
                            <Link href={`/content/view/${id}`}>View Details</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )}
    </div>
  );
}

    
