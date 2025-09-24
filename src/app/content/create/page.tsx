'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { recordUpload } from '@/actions/uploads/recordUpload';

const UPLOAD_ENDPOINT = 'https://neupgroup.com/usercontent/bridge/api/upload.php';

export default function CreatePostPage() {
  const [content, setContent] = React.useState('');
  const [mediaFile, setMediaFile] = React.useState<File | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const userId = 'neupkishor'; // This should be replaced with actual logged-in user

  const handleNext = async () => {
    if (!content.trim()) {
      toast({
        title: 'Content is required',
        description: 'Please write some content for your post.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);

    try {
      // First, create the draft post to get an ID
      const docRef = await addDoc(collection(db, "content"), {
        content,
        mediaUrl: '', // Will be updated after upload
        status: 'Draft',
        author: userId,
        createdAt: serverTimestamp(),
        platforms: [],
        accountIds: [],
      });
      const contentId = docRef.id;

      let mediaUrl = '';
      if (mediaFile) {
        toast({ title: 'Uploading media...', description: 'Please wait while your file is being uploaded.' });

        const formData = new FormData();
        formData.append('file', mediaFile);
        formData.append('platform', 'teamsocial-content');
        formData.append('userid', userId);
        formData.append('contentid', contentId);
        formData.append('name', mediaFile.name.split('.').slice(0, -1).join('.'));

        const response = await fetch(UPLOAD_ENDPOINT, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (result.success) {
            mediaUrl = result.url;
            // Now record the upload in our database
            await recordUpload({
                fileName: mediaFile.name,
                fileSize: mediaFile.size,
                fileType: mediaFile.type,
                uploadedBy: userId,
                filePath: mediaUrl,
                platform: 'teamsocial-content',
                contentId: contentId,
            });
        } else {
            throw new Error(result.message || 'File upload failed.');
        }
      }

      // Update the post with the media URL
      const contentDocRef = doc(db, 'content', contentId);
      await updateDoc(contentDocRef, { mediaUrl });
      
      toast({
        title: 'Draft Saved!',
        description: 'Your post has been saved as a draft.',
      });

      router.push(`/content/edit/${docRef.id}/platforms`);

    } catch (error: any) {
      console.error("Error creating post draft: ", error);
      toast({
        title: 'Error',
        description: error.message || 'Could not save your draft. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMediaFile(e.target.files[0]);
    }
  };

  const handleCancel = () => {
    router.push('/content');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
       <div>
        <h1 className="text-3xl font-bold">Create a New Post</h1>
        <p className="text-muted-foreground">Step 1 of 3: Compose your content</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post Content</CardTitle>
          <CardDescription>Write your post and upload any media you want to include. Your work is saved as a draft.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="post-text">Text</Label>
            <Textarea 
              id="post-text" 
              placeholder="What's happening?" 
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label>Media (Image/Video)</Label>
            <div className="flex items-center justify-center w-full">
                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/50">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {mediaFile ? (
                           <p className="font-semibold text-primary">{mediaFile.name}</p>
                        ) : (
                          <>
                            <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-muted-foreground">SVG, PNG, JPG or MP4</p>
                          </>
                        )}
                    </div>
                    <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} ref={fileInputRef} disabled={isLoading} />
                </label>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between">
         <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleNext} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Next: Select Platforms
        </Button>
      </div>
    </div>
  );
}
