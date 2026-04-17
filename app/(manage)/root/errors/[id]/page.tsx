
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/core/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { deleteErrorAction } from '@/services/error-log-actions';
import { format } from 'date-fns';
import { getErrorAction } from '@/services/db';
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

type FetchedErrorLog = {
  id: string;
  timestamp: string | null;
  errorMessage?: string | null;
  source?: string | null;
  context?: any;
  userId?: string | null;
};

const DetailItem = ({ label, value }: { label: string, value?: string | React.ReactNode }) => {
    if (!value) return null;
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b">
            <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm text-foreground sm:mt-0 font-mono bg-muted/50 px-2 py-1 rounded">{value}</dd>
        </div>
    )
}

const JsonBlock = ({ label, data }: { label: string, data?: any }) => {
    if (!data || Object.keys(data).length === 0) return null;
    return (
        <div>
            <h3 className="text-lg font-semibold mt-6 mb-2">{label}</h3>
            <ScrollArea className="max-h-96 p-4 border rounded-lg bg-muted/50">
                 <pre className="text-xs whitespace-pre-wrap break-all">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </ScrollArea>
        </div>
    )
}

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
      const errorLog = await getErrorAction(id);

      if (errorLog) {
        setErrorLog(errorLog as FetchedErrorLog);
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
  
  const { id: errorId, timestamp, errorMessage, source, context, userId } = errorLog;
  const rawJson = { ...errorLog, timestamp };
  // The 'request' and 'stack' might not exist on all error logs, so handle that gracefully.
  const request = context?.request;
  const stack = context?.stack;


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
            <p className="text-muted-foreground font-mono text-sm">{errorId}</p>
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
          <CardTitle className="text-destructive">{errorMessage}</CardTitle>
          <CardDescription>
             An error occurred in the <span className="font-semibold text-primary">{source || 'unknown source'}</span> process.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <dl>
                <DetailItem label="Timestamp" value={timestamp ? format(new Date(timestamp), 'PPpp') : 'N/A'} />
                <DetailItem label="User ID" value={userId ?? undefined} />
                <DetailItem label="Source" value={source} />
            </dl>

            <JsonBlock label="Context" data={context} />
            
            {stack && (
                 <div>
                    <h3 className="text-lg font-semibold mt-6 mb-2">Stack Trace</h3>
                    <ScrollArea className="max-h-60 p-4 border rounded-lg bg-muted/50">
                        <pre className="text-xs whitespace-pre-wrap break-all font-mono">{stack}</pre>
                    </ScrollArea>
                </div>
            )}
            
            <JsonBlock label="Raw Data" data={rawJson} />

        </CardContent>
      </Card>
    </div>
  );
}
