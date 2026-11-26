'use server';

import { dataStore } from '@/services/repositories';

/** Lists sync logs for an account. */
export const listSyncLogsByAccountId = dataStore.syncLogs.listByAccountId;

/** Creates a sync log. */
export const createSyncLog = dataStore.syncLogs.create;

/** Lists sync log entries for a profile. */
export const listSyncLogEntriesByProfile = dataStore.syncLogEntries.listByProfile;

/** Creates a sync log entry. */
export const createSyncLogEntry = dataStore.syncLogEntries.create;
