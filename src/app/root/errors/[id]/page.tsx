'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ErrorLog } from '@/services/error-logging';
import { deleteErrorAction } from '@/actions/error-log-actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type FetchedErrorLog = Omit<ErrorLog, 'timestamp'> & {
  id: string;
  timestamp: Timestamp;
};

export default function ErrorDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { toast } = useToast();

  const [errorLog, setErrorLog] = React.useState<FetchedErrorLog | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    if (!id) {
      router.push('/root/errors');
      return;
    }
    const fetchError = async () => {
      setLoading(true);
      const docRef = doc(db, 'errors', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setErrorLog({ id: docSnap.id, ...docSnap.data() } as FetchedErrorLog);
      } else {
        toast({ title: 'Error not found', variant: 'destructive' });
        router.push('/root/errors');
      }
      setLoading(false);
    };

    fetchError();
  }, [id, router, toast]);
  
  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteErrorAction(id);
    if(result.success) {
        toast({ title: 'Success', description: 'Error log deleted successfully.' });
        router.push('/root/errors');
    } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        setIsDeleting(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (!errorLog) {
    return <div className="text-center">Error log not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon" disabled={isDeleting}>
            <Link href="/root/errors">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Error Details</h1>
            <p className="text-muted-foreground font-mono text-sm">{errorLog.id}</p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isDeleting}>
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this
                error log from the database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{errorLog.errorMessage}</CardTitle>
          <CardDescription>
            An error occurred in the <span className="font-semibold text-primary">{errorLog.source || 'unknown source'}</span> process.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[70vh] p-4 border rounded-lg bg-muted/50">
            <pre className="text-xs whitespace-pre-wrap break-all">
              {JSON.stringify(
                {
                  ...errorLog,
                  // Convert timestamp to a readable string for JSON view
                  timestamp: errorLog.timestamp ? errorLog.timestamp.toDate().toISOString() : 'N/A',
                },
                null, 2
              )}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
