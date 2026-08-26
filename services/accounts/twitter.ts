'use server';

import { dataStore } from '@/services/repositories';

export const findTwitterAccounts = async () =>
  dataStore.accounts.list({ take: 500 }).then((accounts) =>
    accounts.filter((account) => account.platform === 'Twitter')
  );

export const findTwitterAccountByPlatformId = (platformId: string) =>
  dataStore.accounts.findByPlatformPlatformId({ platform: 'Twitter', platformId });

export const upsertTwitterAccount = (data: Parameters<typeof dataStore.accounts.upsertByOwnerPlatformId>[0]) =>
  dataStore.accounts.upsertByOwnerPlatformId({ ...data, platform: 'Twitter' });
