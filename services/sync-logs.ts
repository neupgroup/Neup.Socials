'use server';

import { dataStore } from '@/core.v2/lib/data-store';

export const listSyncLogsByAccountId = dataStore.syncLogs.listByAccountId;
export const createSyncLog = dataStore.syncLogs.create;
export const listSyncLogEntriesByProfile = dataStore.syncLogEntries.listByProfile;
export const createSyncLogEntry = dataStore.syncLogEntries.create;
