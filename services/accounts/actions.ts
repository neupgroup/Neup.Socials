'use server';

import { cookies } from 'next/headers';
import { self } from '@neup/logica/account/self';
import { getAccountBasics } from '@neup/logica/account/lookup';
import { logger } from '@neup/logica/logger';
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

/**
 * Converts an optional Date into an ISO 8601 string so it can be safely
 * passed from server actions to client components.
 * @param value The date to convert, or null/undefined if not set.
 * @returns The ISO string representation of the date, or null if no date was given.
 */
const toIso = (value?: Date | null) => (value ? value.toISOString() : null);

/**
 * Converts a connected account record into a plain, serializable object by
 * turning its Date fields (connectedOn, updatedAt, lastSyncedAt, createdAt)
 * into ISO strings.
 * @param account The account record returned by getAccount, or null if none was found.
 * @returns The account with its date fields serialized, or null if no account was provided.
 */
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

/**
 * Server action to resolve the visible account profile of the currently
 * signed-in user from the authenticated app cookie.
 * Verifies the auth token, extracts the account ID from its payload, and looks
 * up the account's basic display details.
 * @returns An object with the account's displayName, displayImage, and neupId
 * (each null if unavailable), or null if the user is not authenticated or the
 * lookup fails.
 */
export async function ensureCurrentAccountAction() {
  const authToken = (await cookies()).get('auth')?.value ?? null;
  if (!authToken) return null;

  const authentication = await self.isAuthenticated('local', authToken);
  if (!authentication.authenticated || !('payload' in authentication)) return null;

  const accountId = authentication.payload.aid?.trim();
  if (!accountId) return null;

  let accountInfo;
  try {
    accountInfo = await getAccountBasics({
      accountId,
      fields: ['displayName', 'displayImage', 'neupid'],
    });
  } catch {
    return null;
  }
  if (!accountInfo.ok || !accountInfo.body.success) return null;

  return {
    displayName: accountInfo.body.displayName ?? null,
    displayImage: accountInfo.body.displayImage ?? null,
    neupId: accountInfo.body.neupid ?? null,
  };
}

/**
 * Server action to list connected accounts one page at a time, with optional
 * owner filtering and text search across name, username, and platform.
 * @param params.owner Optional owner to filter accounts by.
 * @param params.search Optional search text matched against name, username, and platform.
 * @param params.skip Number of accounts to skip, used for pagination. Defaults to 0.
 * @returns An object with `items` (the serialized accounts for this page, up to
 * PAGE_SIZE) and `hasMore` (true if more accounts exist beyond this page).
 */
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
    items: accounts.map(
      (account: NonNullable<Awaited<ReturnType<typeof getAccount>>>) =>
        serializeAccount(account)!
    ),
    hasMore: skip + accounts.length < total,
  };
}

/**
 * Server action to list all connected accounts without pagination, with
 * optional owner filtering and text search across name, username, and platform.
 * @param params.owner Optional owner to filter accounts by.
 * @param params.search Optional search text matched against name, username, and platform.
 * @returns An array of all matching accounts, serialized.
 */
export async function listAllAccountsAction({ owner, search }: { owner?: string; search?: string } = {}) {
  const searchBuild = buildTextSearchWhere(search, ['name', 'username', 'platform']);
  const accounts = await listAccounts({ owner, search, searchFilter: searchBuild.where });
  return accounts.map((account: NonNullable<Awaited<ReturnType<typeof getAccount>>>) => serializeAccount(account)!);
}

/**
 * Server action to list all local accounts stored in this app.
 * @returns The list of local accounts as returned by the accounts service.
 */
export async function listLocalAccountsAction() {
  return listLocalAccounts();
}

/**
 * Converts a local account record into a plain, serializable object by
 * turning its `createdOn` date into an ISO string.
 * @param account The local account record, or null/undefined if none was found.
 * @returns The account with `createdOn` serialized, or null if no account was provided.
 */
const serializeLocalAccount = (account: any) => account ? {
  ...account,
  createdOn: toIso(account.createdOn),
} : null;

/**
 * Server action to fetch a single local account by its ID.
 * @param accountId The ID of the local account to look up.
 * @returns The serialized local account, or null if no ID was given or no account was found.
 */
export async function getLocalAccountAction(accountId: string) {
  if (!accountId) return null;
  return serializeLocalAccount(await getLocalAccount(accountId));
}

/**
 * Server action to sync a local account with its latest details from the
 * remote account service. Fetches the remote account's basics (connection ID,
 * display name, display image, NeupID, and account type), then updates the
 * local record. Failures at each stage are logged.
 * @param accountId The ID of the account to sync.
 * @returns On success, an object with `success: true`, the updated serialized
 * `account`, and a `syncedAt` ISO timestamp. On failure, an object with
 * `success: false` and an `error` message describing what went wrong
 * (missing ID, remote lookup failure, or local update failure).
 */
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

/**
 * Server action to fetch a single connected account by its ID.
 * @param id The ID of the connected account to look up.
 * @returns The serialized account, or null if no account was found.
 */
export async function getAccountAction(id: string) {
  return serializeAccount(await getAccount(id));
}

/**
 * Server action to fetch several connected accounts by their IDs in one call.
 * @param ids The IDs of the connected accounts to look up.
 * @returns An array of the matching accounts, serialized.
 */
export async function getAccountsByIdsAction(ids: string[]) {
  const accounts = await getAccountsByIds(ids);
  return accounts.map(
    (account: NonNullable<Awaited<ReturnType<typeof getAccount>>>) =>
      serializeAccount(account)!
  );
}

/**
 * Server action to list all connected WhatsApp accounts.
 * @returns An array of the WhatsApp accounts, serialized.
 */
export async function getWhatsAppAccountsAction() {
  const accounts = await getWhatsAppAccounts();
  return accounts.map(
    (account: NonNullable<Awaited<ReturnType<typeof getAccount>>>) =>
      serializeAccount(account)!
  );
}

/**
 * Server action to create a new connected account for a social or messaging platform.
 * @param data The account details to store.
 * @param data.platform The platform the account belongs to (required).
 * @param data.platformId Optional ID of the account on the platform itself.
 * @param data.name Optional display name of the account.
 * @param data.username Optional username or handle on the platform.
 * @param data.encryptedToken Optional encrypted access token for the platform.
 * @param data.category Optional category of the account.
 * @param data.status Optional status of the account.
 * @param data.owner Optional owner of the account.
 * @param data.nameStatus Optional status of the account's name.
 * @param data.metadata Optional additional platform-specific data.
 * @returns The newly created account, serialized.
 */
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
