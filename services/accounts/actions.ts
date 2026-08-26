'use server';

import { getBasics } from '@/logica/account/self';
import { getAccountBasics } from '@/logica/account/lookup';
import { buildTextSearchWhere } from '@/services/searches/text-search';
import {
  countAccounts,
  createAccount,
  getAccount,
  getAccountsByIds,
  getWhatsAppAccounts,
  listAccounts,
  listLocalAccounts,
  getLocalAccount,
  updateLocalAccount,
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

export async function ensureCurrentAccountAction() {
  const account = (await getBasics())[0];
  if (!account) return null;

  return {
    displayName: account.displayName,
    displayImage: account.displayImage,
    neupId: account.neupid,
  };
}

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

export async function listAllAccountsAction({ owner, search }: { owner?: string; search?: string } = {}) {
  const searchBuild = buildTextSearchWhere(search, ['name', 'username', 'platform']);
  const accounts = await listAccounts({ owner, search, searchFilter: searchBuild.where });
  return accounts.map((account: NonNullable<Awaited<ReturnType<typeof getAccount>>>) => serializeAccount(account)!);
}

export async function listLocalAccountsAction() {
  return listLocalAccounts();
}

const serializeLocalAccount = (account: any) => account ? {
  ...account,
  createdOn: toIso(account.createdOn),
} : null;

export async function getLocalAccountAction(accountId: string) {
  if (!accountId) return null;
  return serializeLocalAccount(await getLocalAccount(accountId));
}

export async function syncLocalAccountAction(accountId: string) {
  if (!accountId) return { success: false, error: 'Account ID is required.' };

  const remote = await getAccountBasics({
    accountId,
    fields: ['neupid', 'displayName', 'displayImage', 'accountType'],
  });

  if (!remote.ok || !remote.body.success) {
    return {
      success: false,
      error: remote.body.error || `Remote account lookup failed with status ${remote.status}.`,
    };
  }

  const account = await updateLocalAccount(accountId, {
    displayName: remote.body.displayName ?? '',
    displayImage: remote.body.displayImage ?? '',
    neupId: remote.body.neupid ?? null,
    type: remote.body.accountType ?? 'individual',
  });

  return { success: true, account: serializeLocalAccount(account), syncedAt: new Date().toISOString() };
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
