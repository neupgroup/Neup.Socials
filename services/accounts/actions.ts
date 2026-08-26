'use server';

import { buildTextSearchWhere } from '@/services/searches/text-search';
import {
  countAccounts,
  createAccount,
  getAccount,
  getAccountsByIds,
  getWhatsAppAccounts,
  listAccounts,
} from '@/services/accounts';

const PAGE_SIZE = 10;
const toIso = (value?: Date | null) => (value ? value.toISOString() : null);

const serializeAccount = (account: Awaited<ReturnType<typeof getAccount>>) =>
  account
    ? {
        ...account,
        connectedOn: toIso(account.connectedOn),
        updatedAt: toIso(account.updatedAt),
        lastSyncedAt: toIso(account.lastSyncedAt),
        createdAt: toIso(account.createdAt),
      }
    : null;

export async function listAccountsAction({ owner, search, skip = 0 }: {
  owner?: string;
  search?: string;
  skip?: number;
}) {
  const searchBuild = buildTextSearchWhere(search, ['name', 'username', 'platform']);
  const [accounts, total] = await Promise.all([
    listAccounts({ owner, search, searchFilter: searchBuild.where, skip, take: PAGE_SIZE }),
    countAccounts({ owner, search, searchFilter: searchBuild.where }),
  ]);

  return {
    items: accounts.map((account) => serializeAccount(account)!),
    hasMore: skip + accounts.length < total,
  };
}

export async function getAccountAction(id: string) {
  return serializeAccount(await getAccount(id));
}

export async function getAccountsByIdsAction(ids: string[]) {
  const accounts = await getAccountsByIds(ids);
  return accounts.map((account) => serializeAccount(account)!);
}

export async function getWhatsAppAccountsAction() {
  const accounts = await getWhatsAppAccounts();
  return accounts.map((account) => serializeAccount(account)!);
}

export async function createConnectedAccountAction(data: {
  platform: string;
  platformId?: string | null;
  name?: string | null;
  username?: string | null;
  encryptedToken?: string | null;
  category?: string | null;
  status?: string | null;
  owner?: string | null;
  nameStatus?: string | null;
  metadata?: unknown;
}) {
  return serializeAccount(await createAccount(data));
}
