'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Twitter, Linkedin, Edit, Trash, ArrowLeft, Send } from 'lucide-react';

const mockPost = {
  id: '2',
  content: 'A deep dive into modern web development trends, exploring the rise of server components, the impact of edge computing on front-end performance, and the latest in CSS innovations that are shaping the future of web design. #webdev #frontend #javascript',
  status: 'Scheduled',
  platform: 'LinkedIn',
  scheduledAt: '2024-08-01 10:00 AM',
  author: 'Team Admin',
};


export default function ViewContentPage({ params }: { params: { id: string } }) {
  const isPublished = mockPost.status === 'Published';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/content">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">View Post Details</h1>
          <p className="text-muted-foreground">Viewing post ID: {params.id}</p>
        </div>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Content</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">{mockPost.content}</p>
                </CardContent>
            </Card>
        </div>

        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant={isPublished ? 'default' : 'secondary'}>{mockPost.status}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Platform</span>
                         <div className="flex items-center gap-2">
                           <Linkedin className="h-4 w-4 text-blue-700"/> <span>{mockPost.platform}</span>
                         </div>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Author</span>
                        <span>{mockPost.author}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{isPublished ? 'Published on' : 'Scheduled for'}</span>
                        <span>{mockPost.scheduledAt}</span>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                   {!isPublished && (
                     <>
                        <Button asChild>
                            <Link href={`/content/edit/${params.id}`}><Edit className="mr-2 h-4 w-4"/> Edit Post</Link>
                        </Button>
                        <Button variant="outline">
                            Cancel Schedule
                        </Button>
                     </>
                   )}
                    <Button variant="destructive">
                        <Trash className="mr-2 h-4 w-4"/> Delete Post
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>


    </div>
  );
}
