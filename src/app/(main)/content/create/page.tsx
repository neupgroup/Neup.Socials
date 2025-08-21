'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud } from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function CreatePostPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
       <div>
        <h1 className="text-3xl font-bold">Create a New Post</h1>
        <p className="text-muted-foreground">Step 1 of 3: Compose your content</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post Content</CardTitle>
          <CardDescription>Write your post and upload any media you want to include.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="post-text">Text</Label>
            <Textarea id="post-text" placeholder="What's happening?" rows={6} />
          </div>
          <div className="space-y-2">
            <Label>Media (Image/Video)</Label>
            <div className="flex items-center justify-center w-full">
                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/50">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-muted-foreground">SVG, PNG, JPG or MP4 (MAX. 800x400px)</p>
                    </div>
                    <input id="dropzone-file" type="file" className="hidden" />
                </label>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between">
         <Button asChild variant="outline">
          <Link href="/content">Cancel</Link>
        </Button>
        <Button asChild>
          <Link href="/content/create/platforms">Next: Select Platforms</Link>
        </Button>
      </div>
    </div>
  );
}
