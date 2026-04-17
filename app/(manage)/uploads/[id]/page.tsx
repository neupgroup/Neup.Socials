'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, Edit, File, Video, FileText } from 'lucide-react';
import { useToast } from '@/core/hooks/use-toast';
import { getPostCollectionsByMediaUrlAction, getUploadAction } from '@/services/db';

type UploadRecord = {
  id: string;
  contentName?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  uploadedOn: string | null;
  filePath: string;
};

type PostRecord = {
    id: string;
    content: string;
    status: string;
};

const formatBytes = (bytes: number, decimals = 2) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getFullMediaUrl = (url: string) => {
    return url && !url.startsWith('http') ? `https://neupgroup.com${url}` : url;
};

const FilePreview = ({ fileType, filePath, fileName }: { fileType: string, filePath: string, fileName: string }) => {
    const fullUrl = getFullMediaUrl(filePath);

    if (fileType.startsWith('image/')) {
        return <Image src={fullUrl} alt={fileName} width={400} height={300} className="rounded-lg object-contain border bg-muted" />;
    }
    if (fileType.startsWith('video/')) {
        return <div className="w-[400px] h-[300px] bg-muted rounded-lg flex flex-col items-center justify-center text-muted-foreground"><Video className="h-16 w-16" /><p className="mt-2">Video File</p></div>;
    }
    if (fileType === 'application/pdf') {
        return <div className="w-[400px] h-[300px] bg-muted rounded-lg flex flex-col items-center justify-center text-muted-foreground"><FileText className="h-16 w-16" /><p className="mt-2">PDF Document</p></div>;
    }
    
    return <div className="w-[400px] h-[300px] bg-muted rounded-lg flex flex-col items-center justify-center text-muted-foreground"><File className="h-16 w-16" /><p className="mt-2">File</p></div>;
}


export default function ViewUploadPage() {
  const params = useParams();
  const id = params.id as string;
  const [upload, setUpload] = React.useState<UploadRecord | null>(null);
  const [posts, setPosts] = React.useState<PostRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();
  const router = useRouter();

  React.useEffect(() => {
    if (!id) return;

    const fetchUploadDetails = async () => {
      setLoading(true);
      try {
        const uploadData = await getUploadAction(id);

        if (!uploadData) {
          toast({ title: 'Upload not found', variant: 'destructive' });
          router.push('/uploads');
          return;
        }

        setUpload(uploadData as UploadRecord);

        const relatedPosts = await getPostCollectionsByMediaUrlAction(uploadData.filePath);
        setPosts(relatedPosts);

      } catch (error) {
        console.error("Error fetching upload details:", error);
        toast({ title: 'Failed to fetch details', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchUploadDetails();
  }, [id, router, toast]);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!upload) {
    return <div className="text-center">Upload not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/uploads">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Upload Details</h1>
          <p className="text-muted-foreground truncate max-w-sm">Viewing file: {upload.fileName}</p>
        </div>
        <Button asChild className="ml-auto">
            <Link href={`/uploads/${id}/edit`}><Edit className="mr-2 h-4 w-4" /> Edit</Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
            <FilePreview fileType={upload.fileType} filePath={upload.filePath} fileName={upload.fileName} />
        </div>
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>File Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Content Name</span><span>{upload.contentName || '-'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">File Name</span><span className="font-mono text-sm">{upload.fileName}</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">File Type</span><span>{upload.fileType}</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">File Size</span><span>{formatBytes(upload.fileSize)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Uploaded By</span><span>{upload.uploadedBy}</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Uploaded On</span><span>{upload.uploadedOn ? format(new Date(upload.uploadedOn), 'PPpp') : 'N/A'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">File Path</span><a href={getFullMediaUrl(upload.filePath)} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-primary hover:underline truncate">{upload.filePath}</a></div>
                </CardContent>
            </Card>
        </div>
      </div>

       <Card>
            <CardHeader>
                <CardTitle>Related Posts</CardTitle>
                <CardDescription>This media has been used in the following posts.</CardDescription>
            </CardHeader>
            <CardContent>
                {posts.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Post Content</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {posts.map(post => (
                                <TableRow key={post.id}>
                                    <TableCell className="truncate max-w-md">{post.content}</TableCell>
                                    <TableCell>{post.status}</TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="ghost" size="sm">
                                            <Link href={`/content/collection/${post.id}`}>View Post</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-muted-foreground text-center py-8">This file has not been used in any posts yet.</p>
                )}
            </CardContent>
       </Card>
    </div>
  );
}
