'use server';

import { dataStore } from '@/services/repositories';

export const createUnifiedIdentity = dataStore.identityUnified.create;
export const updateUnifiedIdentity = dataStore.identityUnified.update;
export const findPlatformIdentity = dataStore.identityPlatform.findByPlatformUserId;
export const upsertPlatformIdentity = dataStore.identityPlatform.upsertWithUnified;
