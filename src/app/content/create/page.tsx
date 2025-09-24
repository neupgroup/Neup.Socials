
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud, Loader2, Image as ImageIcon, Search, CheckCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp, doc, updateDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { recordUpload, UploadRecord } from '@/actions/uploads/recordUpload';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';
import { Input } from '@/components/ui/input';

const UPLOAD_ENDPOINT = 'https://neupgroup.com/usercontent/bridge/api/upload.php';

type Upload = UploadRecord & { id: string, uploadedOn: any };

export default function CreatePostPage() {
  const [content, setContent] = React.useState('');
  const [selectedMediaUrls, setSelectedMediaUrls] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const [uploads, setUploads] = React.useState<Upload[]>([]);
  const [loadingUploads, setLoadingUploads] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const userId = 'neupkishor'; // This should be replaced with actual logged-in user

  React.useEffect(() => {
    setLoadingUploads(true);
    const q = query(collection(db, 'uploads'), orderBy('uploadedOn', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedUploads = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Upload));
      setUploads(fetchedUploads);
      setLoadingUploads(false);
    }, (error) => {
      console.error("Error fetching uploads: ", error);
      toast({ title: 'Could not load media library', variant: 'destructive'});
      setLoadingUploads(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  const uploadFile = (file: File, contentId: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('platform', 'neupsocials-content');
      formData.append('userid', userId);
      formData.append('contentid', contentId);
      formData.append('name', file.name.split('.').slice(0, -1).join('.'));
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', UPLOAD_ENDPOINT, true);
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      };
      
      xhr.onload = async () => {
        setUploadProgress(null); // Clear progress on completion
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            if (result.success) {
              const newUploadRecord = {
                  fileName: file.name,
                  fileSize: file.size,
                  fileType: file.type,
                  uploadedBy: userId,
                  filePath: result.url,
                  platform: 'neupsocials-content',
                  contentId: contentId,
              };
              await recordUpload(newUploadRecord);
              // Auto-select the newly uploaded file
              if (selectedMediaUrls.length < 8) {
                setSelectedMediaUrls(prev => [...prev, result.url]);
              }
              resolve(result.url);
            } else {
              reject(new Error(result.message || 'File upload failed.'));
            }
          } catch(e: any) {
              reject(new Error('Failed to parse upload response.'));
          }
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      };
      
      xhr.onerror = () => {
        setUploadProgress(null); // Clear progress on error
        reject(new Error('Network error during upload.'));
      };
      
      xhr.send(formData);
    });
  };

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
      const docRef = await addDoc(collection(db, "content"), {
        content,
        mediaUrls: selectedMediaUrls, // Save array of URLs
        status: 'Draft',
        author: userId,
        createdAt: serverTimestamp(),
        platforms: [],
        accountIds: [],
      });
      
      toast({ title: 'Draft Saved!', description: 'Your post has been saved as a draft.' });
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

  const handleFileTrigger = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
       // A temporary ID for uploads before post is created. 
       // In a real app, might want a more robust way to handle this.
      const tempContentId = `temp-${Date.now()}`;
      setIsLoading(true);
      try {
        await uploadFile(file, tempContentId);
      } catch (error: any) {
         toast({ title: 'Upload Failed', description: error.message, variant: 'destructive'});
      } finally {
        setIsLoading(false);
         // Clear the file input so the same file can be selected again
        if(fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleMediaToggle = (url: string) => {
    setSelectedMediaUrls((prev) => {
      if (prev.includes(url)) {
        return prev.filter((u) => u !== url);
      } else {
        if(prev.length >= 8) {
          toast({ title: 'You can select up to 8 media items.', variant: 'destructive'});
          return prev;
        }
        return [...prev, url];
      }
    });
  }

  const handleCancel = () => {
    router.push('/content');
  };

  const filteredUploads = uploads.filter(upload => 
    upload.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
       <div>
        <h1 className="text-3xl font-bold">Create a New Post</h1>
        <p className="text-muted-foreground">Step 1 of 3: Compose your content</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post Content</CardTitle>
          <CardDescription>Write your post and optionally add media. Your work is saved as a draft.</CardDescription>
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
            <Label>Media (Image/Video) - Select up to 8</Label>
             <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search media library..." 
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {/* Upload Button */}
                <button
                    onClick={handleFileTrigger}
                    disabled={isLoading}
                    className="relative aspect-square w-full rounded-md border-2 border-dashed bg-muted hover:bg-muted/80 flex flex-col items-center justify-center text-muted-foreground"
                >
                    {isLoading && !uploadProgress ? <Loader2 className="h-6 w-6 animate-spin"/> : <UploadCloud className="h-8 w-8"/>}
                    <span className="text-xs mt-1">Upload</span>
                </button>
                <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} ref={fileInputRef} disabled={isLoading} />

                {/* Media Library */}
                {loadingUploads ? (
                    Array.from({length: 7}).map((_, i) => <div key={i} className="aspect-square w-full rounded-md bg-muted animate-pulse" />)
                ) : (
                    filteredUploads.slice(0, 7).map(upload => (
                        <button 
                            key={upload.id} 
                            onClick={() => handleMediaToggle(upload.filePath)}
                            className="relative aspect-square w-full rounded-md overflow-hidden border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            <Image src={`https://neupgroup.com${upload.filePath}`} alt={upload.fileName} layout="fill" objectFit="cover" className="hover:opacity-80 transition-opacity" />
                            {selectedMediaUrls.includes(upload.filePath) && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <CheckCircle className="h-8 w-8 text-white" />
                                </div>
                            )}
                        </button>
                    ))
                )}
            </div>

            {uploadProgress !== null && (
              <div className="mt-4 space-y-2">
                <Label>Uploading...</Label>
                <Progress value={uploadProgress} />
                <p className="text-sm text-muted-foreground text-center">{uploadProgress}%</p>
              </div>
            )}
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
