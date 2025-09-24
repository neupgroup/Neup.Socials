
'use client';

import * as React from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp, limit, startAfter, where, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Upload, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type UploadRecord = {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  uploadedOn: Timestamp;
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
  const [lastVisible, setLastVisible] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  
  const router = useRouter();

  const fetchUploads = React.useCallback(async (loadMore = false, search = '') => {
    if (!loadMore) setLoading(true);
    else setLoadingMore(true);

    try {
      let q = query(
        collection(db, 'uploads'),
        orderBy('uploadedOn', 'desc'),
        limit(PAGE_SIZE)
      );
      
      if (search) {
        q = query(
          collection(db, 'uploads'),
          where('fileName', '>=', search),
          where('fileName', '<=', search + '\uf8ff'),
          orderBy('fileName'),
          limit(PAGE_SIZE)
        );
      }
      
      if (loadMore && lastVisible) {
        const baseQuery = search 
            ? query(collection(db, 'uploads'), where('fileName', '>=', search), where('fileName', '<=', search + '\uf8ff'), orderBy('fileName'))
            : query(collection(db, 'uploads'), orderBy('uploadedOn', 'desc'));
            
        q = query(baseQuery, startAfter(lastVisible), limit(PAGE_SIZE));
      }

      const documentSnapshots = await getDocs(q);
      const fetchedUploads = documentSnapshots.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as UploadRecord));
      
      setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
      setHasMore(fetchedUploads.length === PAGE_SIZE);
      setUploads(prev => loadMore ? [...prev, ...fetchedUploads] : fetchedUploads);

    } catch (error) {
      console.error("Error fetching uploads: ", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [lastVisible]);
  
  React.useEffect(() => {
    const debouncedSearch = setTimeout(() => {
      setLastVisible(null);
      fetchUploads(false, searchTerm);
    }, 500);

    return () => clearTimeout(debouncedSearch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleRowClick = (uploadId: string) => {
    router.push(`/uploads/${uploadId}`);
  };
  
  const handleShowMore = () => {
      if(hasMore) {
          fetchUploads(true, searchTerm);
      }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Upload className="h-8 w-8 text-primary" />
            Uploaded Files
          </h1>
          <p className="text-muted-foreground">A log of all user-uploaded media files.</p>
        </div>
         <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input 
                placeholder="Search by filename..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>File Log</CardTitle>
          <CardDescription>Latest uploads are shown at the top. Click a row to see details.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : uploads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                    No files have been uploaded yet.
                  </TableCell>
                </TableRow>
              ) : (
                uploads.map((upload) => (
                  <TableRow 
                    key={upload.id} 
                    onClick={() => handleRowClick(upload.id)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium max-w-sm truncate">
                        {upload.fileName}
                    </TableCell>
                    <TableCell>{formatBytes(upload.fileSize)}</TableCell>
                    <TableCell>{upload.uploadedBy}</TableCell>
                    <TableCell>
                      {upload.uploadedOn ? format(upload.uploadedOn.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {hasMore && (
        <div className="text-center">
          <Button onClick={handleShowMore} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Show More
          </Button>
        </div>
      )}
    </div>
  );
}
