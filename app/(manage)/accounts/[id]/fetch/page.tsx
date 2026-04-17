
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, subDays } from 'date-fns';
import { useToast } from '@/core/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Loader2, ArrowLeft, History, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { syncPostsAction } from '@/services/facebook/sync-posts';
import { syncFacebookCommentsAction, syncFacebookMessagesAction } from '@/services/facebook/sync-inbox';
import { listSyncLogsAction } from '@/services/db';

type SyncLog = {
    id: string;
    type: string;
    platform: string;
    createdOn: string | null;
    sinceTime?: string | null;
    toTime?: string | null;
    moreInfo?: {
        status?: 'Success' | 'Failed' | string;
        postsSynced?: number;
        fetched?: number;
        saved?: number;
        operation?: string;
        errorMessage?: string;
        source?: string;
    } | null;
};

export default function FetchHistoryPage() {
    const params = useParams();
    const id = params.id as string; // accountId
    const router = useRouter();
    const { toast } = useToast();

    const [logs, setLogs] = React.useState<SyncLog[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [isSyncing, setIsSyncing] = React.useState<string | null>(null);

    const loadLogs = React.useCallback(async () => {
        if (!id) return;

        setLoading(true);
        try {
            const fetchedLogs = await listSyncLogsAction(id);
            setLogs(
                fetchedLogs.map((log) => ({
                    id: log.id,
                    type: log.type,
                    platform: log.platform,
                    createdOn: log.createdOn,
                    sinceTime: log.sinceTime ?? null,
                    toTime: log.toTime ?? null,
                    moreInfo:
                        log.moreInfo && typeof log.moreInfo === 'object' && !Array.isArray(log.moreInfo)
                            ? (log.moreInfo as SyncLog['moreInfo'])
                            : null,
                }))
            );
        } catch (error) {
            console.error('Error fetching sync logs:', error);
            toast({ title: 'Failed to load sync history', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [id, toast]);

    React.useEffect(() => {
        loadLogs();
    }, [loadLogs]);
    
    const handleSync = async (type: 'older' | 'newer' | 'comments' | 'messages') => {
        if (!id) return;
        setIsSyncing(type);
        
        let options: { since?: number, until?: number } | undefined;

        if (type === 'older' && logs.length > 0) {
            const postsLogs = logs.filter((log) => log.type === 'posts' && !!log.sinceTime);
            const oldestSinceDate = postsLogs.reduce((oldest, log) => {
                if (log.sinceTime && new Date(log.sinceTime) < oldest) {
                    return new Date(log.sinceTime);
                }
                return oldest;
            }, new Date());
            
            const until = Math.floor(oldestSinceDate.getTime() / 1000);
            const since = Math.floor(subDays(oldestSinceDate, 90).getTime() / 1000);
            options = { since, until };
        }

        try {
            let result: { success: boolean; synced?: number; postsSynced?: number; error?: string };

            if (type === 'comments') {
                result = await syncFacebookCommentsAction(id);
            } else if (type === 'messages') {
                result = await syncFacebookMessagesAction(id);
            } else {
                result = await syncPostsAction(id, options);
            }

            if (result.success) {
                const syncedCount = result.synced ?? result.postsSynced ?? 0;
                toast({
                    title: 'Sync Complete',
                    description: `${syncedCount} new item(s) were synced.`,
                });
                await loadLogs();
            } else {
                throw new Error(result.error || 'Unknown sync error');
            }
        } catch (error: any) {
             toast({
                title: 'Sync Failed',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsSyncing(null);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
                 <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                    <Button variant="outline" onClick={() => handleSync('older')} disabled={!!isSyncing || logs.length === 0}>
                        {isSyncing === 'older' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Sync Older Posts
                    </Button>
                    <Button variant="outline" onClick={() => handleSync('newer')} disabled={!!isSyncing}>
                        {isSyncing === 'newer' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Sync Newer Posts
                    </Button>
                    <Button variant="outline" onClick={() => handleSync('comments')} disabled={!!isSyncing}>
                        {isSyncing === 'comments' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Sync Comments
                    </Button>
                    <Button variant="outline" onClick={() => handleSync('messages')} disabled={!!isSyncing}>
                        {isSyncing === 'messages' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Sync Messages
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-6 w-6" />
                        Fetch Logs
                    </CardTitle>
                    <CardDescription>
                        A unified log of posts, comments, messages, and related sync info.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
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
                                            No sync history found. Run a sync to generate logs.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-mono text-xs whitespace-nowrap">
                                                {log.createdOn ? format(new Date(log.createdOn), 'PPpp') : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={log.moreInfo?.status === 'Failed' ? 'destructive' : 'default'}>
                                                    {log.moreInfo?.status === 'Failed' ? 
                                                        <XCircle className="mr-1 h-3 w-3" /> :
                                                        <CheckCircle className="mr-1 h-3 w-3" />
                                                    }
                                                    {log.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {log.moreInfo?.status === 'Failed' ? (
                                                    <span className="text-destructive text-sm">{log.moreInfo.errorMessage || 'Sync failed.'}</span>
                                                ) : (
                                                    <span>
                                                        Synced {log.moreInfo?.saved ?? log.moreInfo?.postsSynced ?? 0} item(s)
                                                        {typeof log.moreInfo?.fetched === 'number' ? ` (fetched ${log.moreInfo.fetched})` : ''}.
                                                    </span>
                                                )}
                                                {(log.sinceTime || log.toTime) && (
                                                    <p className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                                                        Range: {log.sinceTime ? format(new Date(log.sinceTime), 'P') : 'N/A'} - {log.toTime ? format(new Date(log.toTime), 'P') : 'N/A'}
                                                    </p>
                                                )}
                                            </TableCell>
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
