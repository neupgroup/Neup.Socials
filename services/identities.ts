'use server';

import { dataStore } from '@/core.v2/lib/data-store';

export const createUnifiedIdentity = dataStore.identityUnified.create;
export const updateUnifiedIdentity = dataStore.identityUnified.update;
export const findPlatformIdentity = dataStore.identityPlatform.findByPlatformUserId;
export const upsertPlatformIdentity = dataStore.identityPlatform.upsertWithUnified;
