'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud, ArrowLeft, Loader2, Image } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

export default function EditPostPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [content, setContent] = React.useState('');
  const [mediaFile, setMediaFile] = React.useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
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
        setContent(data.content);
        setMediaUrl(data.mediaUrl);
      } else {
        toast({
          title: 'Post not found',
          variant: 'destructive',
        });
        router.push('/content');
      }
      setIsLoading(false);
    };

    fetchPost();
  }, [id, router, toast]);

  const handleNext = async () => {
    setIsSaving(true);
    try {
      let newMediaUrl = mediaUrl;
      if (mediaFile) {
        const storageRef = ref(storage, `content/${Date.now()}_${mediaFile.name}`);
        const snapshot = await uploadBytes(storageRef, mediaFile);
        newMediaUrl = await getDownloadURL(snapshot.ref);
      }

      const docRef = doc(db, 'content', id);
      await updateDoc(docRef, {
        content,
        mediaUrl: newMediaUrl,
      });

      router.push(`/content/edit/${id}/platforms`);
    } catch (error) {
      console.error("Error updating post: ", error);
      toast({
        title: 'Error',
        description: 'Failed to update post. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMediaFile(e.target.files[0]);
      setMediaUrl(URL.createObjectURL(e.target.files[0])); // for preview
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
       <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href={`/content/view/${id}`}>
            <ArrowLeft />
          </Link>
        </Button>
        <div>
            <h1 className="text-3xl font-bold">Edit Post</h1>
            <p className="text-muted-foreground">Step 1 of 3: Modify your content</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post Content</CardTitle>
          <CardDescription>Update your post and media.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="post-text">Text</Label>
            <Textarea id="post-text" value={content} onChange={e => setContent(e.target.value)} rows={6} disabled={isSaving} />
          </div>
          <div className="space-y-2">
            <Label>Media (Image/Video)</Label>
            {mediaUrl && !mediaFile && (
              <div className="mb-4">
                <img src={mediaUrl} alt="Current media" className="rounded-lg max-h-64 w-auto" />
              </div>
            )}
            <div className="flex items-center justify-center w-full">
                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/50">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {mediaFile ? (
                          <p className="font-semibold text-primary">{mediaFile.name}</p>
                        ) : (
                          <>
                            <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-muted-foreground">Upload new media to replace the current one</p>
                          </>
                        )}
                    </div>
                    <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} disabled={isSaving} />
                </label>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between">
         <Button asChild variant="outline" disabled={isSaving}>
          <Link href={`/content/view/${id}`}>Cancel</Link>
        </Button>
        <Button onClick={handleNext} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Next: Select Platforms
        </Button>
      </div>
    </div>
  );
}
