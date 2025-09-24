
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Loader2, ArrowLeft, History, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type SyncLog = {
    id: string;
    syncedAt: Timestamp;
    status: 'Success' | 'Failed';
    postsSynced?: number;
    errorMessage?: string;
    range?: {
        since: Timestamp;
        until: Timestamp;
    }
};

export default function FetchHistoryPage() {
    const params = useParams();
    const id = params.id as string; // accountId
    const router = useRouter();
    const { toast } = useToast();

    const [logs, setLogs] = React.useState<SyncLog[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!id) return;

        setLoading(true);
        const logsQuery = query(
            collection(db, 'sync_logs'),
            where('accountId', '==', id),
            orderBy('syncedAt', 'desc')
        );

        const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
            const fetchedLogs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as SyncLog));
            setLogs(fetchedLogs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching sync logs:", error);
            toast({ title: 'Failed to load sync history', variant: 'destructive' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id, toast]);
    
    const handleActionClick = (actionName: string) => {
        toast({
            title: 'Coming Soon!',
            description: `'${actionName}' functionality is not yet implemented.`
        });
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button asChild variant="outline" size="icon">
                        <Link href={`/accounts/${id}`}>
                            <ArrowLeft />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Sync History</h1>
                        <p className="text-muted-foreground">History of post fetching operations for this account.</p>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => handleActionClick('Sync Older Posts')}>Sync Older Posts</Button>
                    <Button variant="outline" onClick={() => handleActionClick('Sync Newer Posts')}>Sync Newer Posts</Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-6 w-6" />
                        Fetch Logs
                    </CardTitle>
                    <CardDescription>
                        A log of all post synchronization attempts, with the newest first.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24">
                                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                                    </TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                                        No sync history found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="font-mono text-xs">
                                            {format(log.syncedAt.toDate(), 'PPpp')}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={log.status === 'Success' ? 'default' : 'destructive'}>
                                                {log.status === 'Success' ? 
                                                    <CheckCircle className="mr-1 h-3 w-3" /> : 
                                                    <XCircle className="mr-1 h-3 w-3" />
                                                }
                                                {log.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {log.status === 'Success' ?
                                                `Synced ${log.postsSynced} new post(s).`
                                                :
                                                <span className="text-destructive text-sm">{log.errorMessage}</span>
                                            }
                                            {log.range && (
                                                <p className="text-xs text-muted-foreground font-mono">
                                                    Range: {format(log.range.since.toDate(), 'P')} - {format(log.range.until.toDate(), 'P')}
                                                </p>
                                            )}
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
