
'use client';

import * as React from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, AlertTriangle, Eye } from 'lucide-react';
import { ErrorLog } from '@/services/error-logging';
import { ScrollArea } from '@/components/ui/scroll-area';

type FetchedErrorLog = Omit<ErrorLog, 'timestamp'> & {
  id: string;
  timestamp: Timestamp;
};

export default function ErrorLogsPage() {
  const [errors, setErrors] = React.useState<FetchedErrorLog[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'errors'), orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedErrors = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as FetchedErrorLog));
      setErrors(fetchedErrors);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching error logs: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getBadgeVariant = (source?: string) => {
    if (!source) return 'outline';
    if (source.toLowerCase().includes('facebook')) return 'destructive';
    if (source.toLowerCase().includes('ai')) return 'secondary';
    return 'outline';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            Application Error Logs
          </h1>
          <p className="text-muted-foreground">A real-time log of all recorded errors in the system.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Error Stream</CardTitle>
          <CardDescription>Latest errors are shown at the top.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : errors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                    No errors recorded. The system is healthy.
                  </TableCell>
                </TableRow>
              ) : (
                errors.map((error) => (
                  <TableRow key={error.id}>
                    <TableCell className="font-mono text-xs">
                      {error.timestamp ? format(error.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}
                    </TableCell>
                    <TableCell className="font-medium max-w-sm truncate">{error.message}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(error.source)}>{error.source || 'Unknown'}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{error.userId || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>Error Details: {error.id}</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="max-h-[70vh] p-4 border rounded-lg bg-muted/50">
                            <pre className="text-xs whitespace-pre-wrap break-all">
                              {JSON.stringify(
                                {
                                  ...error,
                                  // Convert timestamp to a readable string for JSON view
                                  timestamp: error.timestamp ? error.timestamp.toDate().toISOString() : 'N/A',
                                },
                                null, 2
                              )}
                            </pre>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
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
