'use server';

import { dataStore } from '@/services/repositories';

/** Creates a unified identity that groups a person's platform identities. */
export const createUnifiedIdentity = dataStore.identityUnified.create;

/** Updates a unified identity. */
export const updateUnifiedIdentity = dataStore.identityUnified.update;

/** Finds a platform identity by its platform-native user ID. */
export const findPlatformIdentity = dataStore.identityPlatform.findByPlatformUserId;

/** Creates or updates a platform identity and links it to a unified identity. */
export const upsertPlatformIdentity = dataStore.identityPlatform.upsertWithUnified;
