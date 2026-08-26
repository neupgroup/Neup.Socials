'use server';

import { getAccount } from '@/services/accounts';
import { listSyncLogEntriesByProfile, listSyncLogsByAccountId } from '@/services/sync-logs';

const toIso = (value?: Date | null) => (value ? value.toISOString() : null);

export async function listSyncLogsAction(accountId: string) {
  const account = await getAccount(accountId);
  if (!account) return [];
  const [entries, legacyLogs] = await Promise.all([
    listSyncLogEntriesByProfile({ forProfile: accountId, take: 300 }),
    listSyncLogsByAccountId(accountId),
  ]);
  const mappedEntries = entries.map((entry) => ({ id: entry.id, type: entry.type, platform: entry.platform, forProfile: entry.forProfile, sinceTime: toIso(entry.sinceTime), toTime: toIso(entry.toTime), moreInfo: entry.moreInfo, createdOn: toIso(entry.createdOn), source: 'sync_log' }));
  const mappedLegacy = legacyLogs.map((log) => {
    const range = log.range && typeof log.range === 'object' && !Array.isArray(log.range) ? (log.range as { since?: string; until?: string }) : {};
    return { id: `legacy_${log.id}`, type: 'posts', platform: account.platform.toLowerCase(), forProfile: accountId, sinceTime: range.since ?? null, toTime: range.until ?? null, moreInfo: { status: log.status, postsSynced: log.postsSynced, errorMessage: log.errorMessage, details: log.details, source: 'legacy.sync_logs' }, createdOn: toIso(log.syncedAt), source: 'sync_logs' };
  });
  return [...mappedEntries, ...mappedLegacy].sort((a, b) => (b.createdOn ? new Date(b.createdOn).getTime() : 0) - (a.createdOn ? new Date(a.createdOn).getTime() : 0));
}
