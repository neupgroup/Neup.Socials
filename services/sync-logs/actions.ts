'use server';

import { getAccount } from '@/services/accounts';
import { listSyncLogEntriesByProfile, listSyncLogsByAccountId } from '@/services/sync-logs';

/**
 * Converts an optional Date into an ISO 8601 string so it can be safely
 * serialized across the server/client boundary.
 * @param value - The date to convert; may be `null` or `undefined`.
 * @returns The ISO 8601 string, or `null` when no date is provided.
 */
const toIso = (value?: Date | null) => (value ? value.toISOString() : null);

/**
 * Server action that returns a unified, newest-first list of sync log records
 * for an account.
 * 
 * Merges two sources into one normalized shape:
 * - **Current entries** from `sync_log` (up to 300 most recent for the profile).
 * - **Legacy logs** from `legacy.sync_logs`, whose `range` JSON (`since` / `until`)
 *   is mapped to `sinceTime` / `toTime`, and whose status, post count, error and
 *   details are folded into `moreInfo`. Legacy ids are prefixed with `legacy_`
 *   to avoid collisions with current entry ids.
 * All dates are returned as ISO strings. Records without a `createdOn` value
 * sort last.
 *
 * @param accountId - The id of the account (also used as the `forProfile` key).
 * @returns A promise resolving to the merged and sorted log records, or an empty
 *   array if the account does not exist. Each record contains:
 *   `id`, `type`, `platform`, `forProfile`, `sinceTime`, `toTime`, `moreInfo`,
 *   `createdOn`, and `source` (`'sync_log'` or `'sync_logs'`).
 */
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
