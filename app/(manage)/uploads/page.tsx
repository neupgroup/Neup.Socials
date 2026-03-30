
'use client';

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Upload, Search, FileText, MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { listUploadsAction } from '@/actions/db';

type UploadRecord = {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  uploadedOn: string | null;
  filePath: string;
  contentId: string;
};

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const PAGE_SIZE = 10;

export default function UploadsPage() {
  const [uploads, setUploads] = React.useState<UploadRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  
  const router = useRouter();
  const { toast } = useToast();

  const fetchUploads = React.useCallback(async (loadMore = false, search = '') => {
    if (!loadMore) setLoading(true);
    else setLoadingMore(true);

    try {
      const skip = loadMore ? uploads.length : 0;
      const result = await listUploadsAction({ search, skip });
      setHasMore(result.hasMore);
      setUploads(prev => loadMore ? [...prev, ...result.items] : result.items);

    } catch (error) {
      console.error("Error fetching uploads: ", error);
      toast({ title: "Failed to fetch uploads", variant: 'destructive' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [toast, uploads.length]);
  
  React.useEffect(() => {
    const debouncedSearch = setTimeout(() => {
      fetchUploads(false, searchTerm);
    }, 500);

    return () => clearTimeout(debouncedSearch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleCardClick = (uploadId: string) => {
    router.push(`/uploads/${uploadId}`);
  };
  
  const handleShowMore = () => {
      if(hasMore) {
          fetchUploads(true, searchTerm);
      }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Upload className="h-8 w-8 text-primary" />
            Uploaded Files
          </h1>
          <p className="text-muted-foreground">A log of all user-uploaded media files.</p>
        </div>
         <div className="relative w-full md:w-auto">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input 
                placeholder="Search by filename..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

       {loading ? (
        <div className="grid grid-cols-1 gap-4">
            {Array.from({length: 3}).map((_, i) => (
                <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                           <div className="h-10 w-10 rounded-full bg-muted"></div>
                           <div>
                               <div className="h-5 w-40 rounded-md bg-muted"></div>
                               <div className="h-4 w-24 mt-1 rounded-md bg-muted"></div>
                           </div>
                       </div>
                       <div className="h-8 w-24 rounded-md bg-muted"></div>
                    </CardContent>
                </Card>
            ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
            {uploads.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                        No files have been uploaded yet.
                    </CardContent>
                </Card>
            ) : (
                uploads.map((upload) => (
                    <Card key={upload.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleCardClick(upload.id)}>
                        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 overflow-hidden">
                                <div className="bg-muted p-3 rounded-full">
                                    <FileText className="h-5 w-5 text-foreground" />
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="font-bold text-lg truncate">{upload.fileName}</h3>
                                    <p className="text-sm text-muted-foreground">Uploaded by {upload.uploadedBy}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                <div className="text-xs text-muted-foreground text-left sm:text-right">
                                   <span>{upload.uploadedOn ? formatDistanceToNow(new Date(upload.uploadedOn), { addSuffix: true }) : 'Unknown date'}</span>
                                    <span className="mx-1">•</span>
                                   <span>{formatBytes(upload.fileSize)}</span>
                                </div>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/uploads/${upload.id}`) }}>View Details</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
      )}
      
      {!loading && hasMore && (
        <div className="text-center mt-6">
          <Button onClick={handleShowMore} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Show More
          </Button>
        </div>
      )}
    </div>
  );
}
