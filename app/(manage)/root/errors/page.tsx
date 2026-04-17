
'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { clearAllErrorsAction } from '@/services/error-log-actions';
import { useToast } from '@/core/hooks/use-toast';
import { listErrorsAction } from '@/services/db';
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
  userId?: string | null;
};

export default function ErrorLogsPage() {
  const [errors, setErrors] = React.useState<FetchedErrorLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isClearing, setIsClearing] = React.useState(false);

  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    setLoading(true);
    listErrorsAction()
      .then((fetchedErrors) => {
        setErrors(fetchedErrors as FetchedErrorLog[]);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching error logs: ", error);
        setLoading(false);
      });
  }, []);

  const handleRowClick = (id: string) => {
    router.push(`/root/errors/${id}`);
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    const result = await clearAllErrorsAction();
    if (result.success) {
      toast({ title: 'Success', description: 'All error logs have been cleared.' });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsClearing(false);
  }

  const getBadgeVariant = (source?: string) => {
    if (!source) return 'outline';
    if (source.toLowerCase().includes('facebook')) return 'destructive';
    if (source.toLowerCase().includes('ai')) return 'secondary';
    return 'outline';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            Application Error Logs
          </h1>
          <p className="text-muted-foreground">A real-time log of all recorded errors in the system.</p>
        </div>
         <AlertDialog>
          <AlertDialogTrigger asChild>
             <Button variant="destructive" disabled={isClearing || errors.length === 0}>
              {isClearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Clear All Errors
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete all
                error logs from the database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearAll}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Error Stream</CardTitle>
          <CardDescription>Latest errors are shown at the top. Click a message to see details.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-[180px]">Timestamp</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>User ID</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {loading ? (
                        <TableRow>
                        <TableCell colSpan={4} className="text-center h-24">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                        </TableCell>
                        </TableRow>
                    ) : errors.length === 0 ? (
                        <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                            No errors recorded. The system is healthy.
                        </TableCell>
                        </TableRow>
                    ) : (
                        errors.map((error) => (
                        <TableRow 
                            key={error.id} 
                            onClick={() => handleRowClick(error.id)}
                            className="cursor-pointer"
                        >
                            <TableCell className="font-mono text-xs whitespace-nowrap">
                            {error.timestamp ? format(new Date(error.timestamp), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}
                            </TableCell>
                            <TableCell className="font-medium max-w-sm truncate">{error.errorMessage}</TableCell>
                            <TableCell>
                            <Badge variant={getBadgeVariant(error.source ?? undefined)}>{error.source || 'Unknown'}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{error.userId || 'N/A'}</TableCell>
                        </TableRow>
                        ))
                    )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
