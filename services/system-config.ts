'use server';

import { dataStore } from '@/core.v2/lib/data-store';

export const getSystemConfig = dataStore.systemConfig.getByKey;
export const upsertSystemConfig = dataStore.systemConfig.upsert;
export const createSystemAlert = dataStore.systemAlerts.create;
