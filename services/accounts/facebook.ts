'use server';

import { dataStore } from '@/services/repositories';

export const findFacebookAccounts = async () =>
  dataStore.accounts.list({ take: 500 }).then((accounts) =>
    accounts.filter((account) => account.platform === 'Facebook')
  );

export const findFacebookAccountByPlatformId = (platformId: string) =>
  dataStore.accounts.findByPlatformPlatformId({ platform: 'Facebook', platformId });

export const upsertFacebookAccount = (data: Parameters<typeof dataStore.accounts.upsertByOwnerPlatformId>[0]) =>
  dataStore.accounts.upsertByOwnerPlatformId({ ...data, platform: 'Facebook' });
