'use server';

import { self } from '#/logica/account/self';
import { getAccountBasics } from '#/logica/account/lookup';
import { logger } from '#/logica/logger';
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
  const account = await self.ensureRecord();
  if (!account) return null;

  return {
    displayName: account.displayName,
    displayImage: account.displayImage,
    neupId: account.neupId,
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

  let remote;
  try {
    remote = await getAccountBasics({
      accountId,
      fields: ['neupid', 'accountId', 'connectionId', 'displayName', 'displayImage', 'accountType'],
    });
  } catch (error) {
    void logger
      .type('error')
      .data({
        source: 'syncLocalAccountAction',
        event: 'remote_account_lookup_exception',
        accountId,
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
      })
      .error()
      .catch(() => undefined);
    return { success: false, error: `Remote account lookup failed: ${error instanceof Error ? error.message : 'Unknown lookup error.'}` };
  }

  if (!remote.ok || !remote.body.success) {
    const remoteMessage = remote.body.error || remote.body.reason || (
      remote.status === 401 || remote.status === 403
        ? 'Invalid application credentials.'
        : remote.status === 404
          ? `Remote account ${accountId} was not found.`
          : 'The remote server returned an unsuccessful account response.'
    );
    void logger
      .type('error')
      .data({
        source: 'syncLocalAccountAction',
        event: 'remote_account_lookup_failed',
        accountId,
        status: remote.status,
        error: remoteMessage,
        remoteBody: remote.body,
      })
      .error()
      .catch(() => undefined);
    return {
      success: false,
      error: `Remote account lookup failed (${remote.status}): ${remoteMessage}`,
    };
  }

  let account;
  try {
    account = await updateLocalAccount(accountId, {
      connectionId: remote.body.connectionId ?? '',
      displayName: remote.body.displayName ?? '',
      displayImage: remote.body.displayImage ?? '',
      neupId: remote.body.neupid ?? null,
      type: remote.body.accountType ?? 'individual',
    });
  } catch (error) {
    void logger
      .type('error')
      .data({
        source: 'syncLocalAccountAction',
        event: 'local_account_update_failed',
        accountId,
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
      })
      .error()
      .catch(() => undefined);
    return { success: false, error: 'Local account update failed.' };
  }

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
