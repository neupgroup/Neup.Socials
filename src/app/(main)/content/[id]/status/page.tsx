'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, Clock, BarChart2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';

const mockStatus = {
  id: '1',
  status: 'Published',
  publishedAt: '2024-07-28 09:00 AM',
  platform: 'Twitter',
  analytics: {
    likes: 120,
    comments: 15,
    shares: 45,
    reach: 1500,
  }
};

const mockScheduledStatus = {
  id: '2',
  status: 'Scheduled',
  scheduledAt: '2024-08-01 10:00 AM',
  platform: 'LinkedIn'
};


export default function PostStatusPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const post = id === '1' ? mockStatus : mockScheduledStatus;
  const isPublished = post.status === 'Published';
  const progressValue = isPublished ? Math.floor((post.analytics.likes / 200) * 100) : 0;

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
            <p className="text-muted-foreground">Check the status of your post ID: {id}</p>
        </div>
      </div>
        
        {isPublished ? (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-6 w-6 text-green-500" />
                        <span>Published Successfully</span>
                    </CardTitle>
                    <CardDescription>
                        Your post went live on {post.platform} at {post.publishedAt}.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Likes</p>
                            <p className="text-2xl font-bold">{post.analytics.likes}</p>
                        </div>
                         <div className="space-y-1 text-right">
                            <p className="text-sm font-medium text-muted-foreground">Comments</p>
                            <p className="text-2xl font-bold">{post.analytics.comments}</p>
                        </div>
                         <div className="space-y-1 text-right">
                            <p className="text-sm font-medium text-muted-foreground">Shares</p>
                            <p className="text-2xl font-bold">{post.analytics.shares}</p>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label>Reach: {post.analytics.reach} users</Label>
                        <Progress value={progressValue} />
                    </div>
                    <Button asChild variant="secondary">
                        <Link href="/analytics"><BarChart2 className="mr-2 h-4 w-4"/> View Full Analytics</Link>
                    </Button>
                </CardContent>
            </Card>
        ) : (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-6 w-6 text-blue-500" />
                        <span>Post is Scheduled</span>
                    </CardTitle>
                    <CardDescription>
                        This post is scheduled to be published on {post.platform}.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-center py-10">
                    <p className="text-lg">Scheduled for:</p>
                    <p className="text-4xl font-bold text-primary">{post.scheduledAt}</p>
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
        )}
    </div>
  );
}