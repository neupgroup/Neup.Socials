'use client';

import * as React from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, ExternalLink } from 'lucide-react';
import Link from 'next/link';

type UploadRecord = {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  uploadedOn: Timestamp;
  filePath: string;
  platform: string;
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

export default function UploadsPage() {
  const [uploads, setUploads] = React.useState<UploadRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'uploads'), orderBy('uploadedOn', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedUploads = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as UploadRecord));
      setUploads(fetchedUploads);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching uploads: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Upload className="h-8 w-8 text-primary" />
            Uploaded Files
          </h1>
          <p className="text-muted-foreground">A log of all user-uploaded media files.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>File Log</CardTitle>
          <CardDescription>Latest uploads are shown at the top.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : uploads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                    No files have been uploaded yet.
                  </TableCell>
                </TableRow>
              ) : (
                uploads.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell className="font-medium max-w-sm truncate">{upload.fileName}</TableCell>
                    <TableCell>{formatBytes(upload.fileSize)}</TableCell>
                    <TableCell>{upload.uploadedBy}</TableCell>
                    <TableCell>
                      {upload.uploadedOn ? format(upload.uploadedOn.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'}
                    </TableCell>
                     <TableCell>
                      <Badge variant="secondary">{upload.platform}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <Button asChild variant="ghost" size="icon">
                         <a href={`https://neupgroup.com${upload.filePath}`} target="_blank" rel="noopener noreferrer">
                           <ExternalLink className="h-4 w-4" />
                         </a>
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
