'use server';

import { dataStore } from '@/services/repositories';

/**
 * Finds all connected Twitter accounts.
 * Loads up to 500 accounts from the data store and keeps only those whose platform is Twitter.
 * @returns An array of the Twitter accounts.
 */
export const findTwitterAccounts = async () =>
  dataStore.accounts.list({ take: 500 }).then((accounts) =>
    accounts.filter((account) => account.platform === 'Twitter')
  );

/**
 * Finds a single connected Twitter account by its ID on the platform.
 * @param platformId The account's ID on Twitter.
 * @returns The matching Twitter account as returned by the data store.
 */
export const findTwitterAccountByPlatformId = (platformId: string) =>
  dataStore.accounts.findByPlatformPlatformId({ platform: 'Twitter', platformId });

/**
 * Creates or updates a Twitter account, matched by owner and platform ID.
 * The platform is always set to Twitter, overriding any value in `data`.
 * @param data The account details accepted by the data store's upsert, excluding the platform.
 * @returns The created or updated account as returned by the data store.
 */
export const upsertTwitterAccount = (data: Parameters<typeof dataStore.accounts.upsertByOwnerPlatformId>[0]) =>
  dataStore.accounts.upsertByOwnerPlatformId({ ...data, platform: 'Twitter' });
