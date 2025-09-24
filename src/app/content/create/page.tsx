
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud, Loader2, Image as ImageIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp, doc, updateDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { recordUpload, UploadRecord } from '@/actions/uploads/recordUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';

const UPLOAD_ENDPOINT = 'https://neupgroup.com/usercontent/bridge/api/upload.php';

type Upload = UploadRecord & { id: string, uploadedOn: any };

export default function CreatePostPage() {
  const [content, setContent] = React.useState('');
  const [mediaFile, setMediaFile] = React.useState<File | null>(null);
  const [selectedMediaUrl, setSelectedMediaUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [uploads, setUploads] = React.useState<Upload[]>([]);
  const [loadingUploads, setLoadingUploads] = React.useState(true);
  
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
        mediaUrl: '',
        status: 'Draft',
        author: userId,
        createdAt: serverTimestamp(),
        platforms: [],
        accountIds: [],
      });
      const contentId = docRef.id;

      let finalMediaUrl = selectedMediaUrl;
      
      if (mediaFile) {
        toast({ title: 'Uploading media...', description: 'Please wait while your file is being uploaded.' });

        const formData = new FormData();
        formData.append('file', mediaFile);
        formData.append('platform', 'teamsocial-content');
        formData.append('userid', userId);
        formData.append('contentid', contentId);
        formData.append('name', mediaFile.name.split('.').slice(0, -1).join('.'));

        const response = await fetch(UPLOAD_ENDPOINT, { method: 'POST', body: formData });
        const result = await response.json();

        if (result.success) {
            finalMediaUrl = result.url;
            await recordUpload({
                fileName: mediaFile.name,
                fileSize: mediaFile.size,
                fileType: mediaFile.type,
                uploadedBy: userId,
                filePath: finalMediaUrl,
                platform: 'teamsocial-content',
                contentId: contentId,
            });
        } else {
            throw new Error(result.message || 'File upload failed.');
        }
      }

      await updateDoc(doc(db, 'content', contentId), { mediaUrl: finalMediaUrl || '' });
      
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMediaFile(e.target.files[0]);
      setSelectedMediaUrl(null); // Clear library selection
    }
  };

  const handleSelectFromLibrary = (upload: Upload) => {
    setSelectedMediaUrl(upload.filePath);
    setMediaFile(null); // Clear file selection
  }

  const handleCancel = () => {
    router.push('/content');
  };

  const previewUrl = mediaFile ? URL.createObjectURL(mediaFile) : selectedMediaUrl ? `https://neupgroup.com${selectedMediaUrl}` : null;
  const previewName = mediaFile ? mediaFile.name : selectedMediaUrl ? selectedMediaUrl.split('/').pop() : null;

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
            <Label>Media (Image/Video)</Label>
             <Tabs defaultValue="upload">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">Upload New</TabsTrigger>
                    <TabsTrigger value="library">Select from Library</TabsTrigger>
                </TabsList>
                <TabsContent value="upload">
                    <div className="flex items-center justify-center w-full mt-2">
                        <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/50">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <UploadCloud className="w-8 h-8 mb-3 text-muted-foreground" />
                                <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-muted-foreground">SVG, PNG, JPG or MP4</p>
                            </div>
                            <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} ref={fileInputRef} disabled={isLoading} />
                        </label>
                    </div>
                </TabsContent>
                <TabsContent value="library">
                     <ScrollArea className="h-48 w-full rounded-md border p-2 mt-2">
                        {loadingUploads ? (
                             <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>
                        ) : uploads.length === 0 ? (
                            <div className="flex justify-center items-center h-full text-muted-foreground">No uploads found.</div>
                        ) : (
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                                {uploads.map(upload => (
                                    <button 
                                        key={upload.id} 
                                        onClick={() => handleSelectFromLibrary(upload)}
                                        className={`relative aspect-square w-full rounded-md overflow-hidden border-2 ${selectedMediaUrl === upload.filePath ? 'border-primary' : 'border-transparent'}`}
                                    >
                                        <Image src={`https://neupgroup.com${upload.filePath}`} alt={upload.fileName} layout="fill" objectFit="cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </TabsContent>
            </Tabs>
            {previewUrl && (
                <div className="mt-4 p-4 border rounded-lg flex items-center gap-4">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold">Selected Media:</p>
                        <p className="text-xs text-muted-foreground truncate">{previewName}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setMediaFile(null); setSelectedMediaUrl(null); }}>Clear</Button>
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

