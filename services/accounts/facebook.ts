'use server';

import { dataStore } from '@/services/repositories';

/**
 * Finds all connected Facebook accounts.
 * Loads up to 500 accounts from the data store and keeps only those whose platform is Facebook.
 * @returns An array of the Facebook accounts.
 */
export const findFacebookAccounts = async () =>
  dataStore.accounts.list({ take: 500 }).then((accounts) =>
    accounts.filter((account) => account.platform === 'Facebook')
  );

/**
 * Finds a single connected Facebook account by its ID on the platform.
 * @param platformId The account's ID on Facebook.
 * @returns The matching Facebook account as returned by the data store.
 */
export const findFacebookAccountByPlatformId = (platformId: string) =>
  dataStore.accounts.findByPlatformPlatformId({ platform: 'Facebook', platformId });

/**
 * Creates or updates a Facebook account, matched by owner and platform ID.
 * The platform is always set to Facebook, overriding any value in `data`.
 * @param data The account details accepted by the data store's upsert, excluding the platform.
 * @returns The created or updated account as returned by the data store.
 */
export const upsertFacebookAccount = (data: Parameters<typeof dataStore.accounts.upsertByOwnerPlatformId>[0]) =>
  dataStore.accounts.upsertByOwnerPlatformId({ ...data, platform: 'Facebook' });
