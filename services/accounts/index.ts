'use server';

import { dataStore } from '@/services/repositories';
import { logError } from '@/services/error-logging';
import { encrypt } from '@neup/core/helpers/crypto';
import { revalidatePath } from 'next/cache';

/** Lists connected accounts, with optional filtering and pagination handled by the data store. */
export const listAccounts = dataStore.accounts.list;

/** Counts connected accounts matching the given filters. */
export const countAccounts = dataStore.accounts.count;

/** Fetches a single connected account by its ID. */
export const getAccount = dataStore.accounts.getById;

/** Fetches several connected accounts by their IDs. */
export const getAccountsByIds = dataStore.accounts.getByIds;

/** Fetches all connected WhatsApp accounts. */
export const getWhatsAppAccounts = dataStore.accounts.getWhatsAppAccounts;

/** Finds a connected account by its owner and its ID on the platform. */
export const findAccountByOwnerPlatformId = dataStore.accounts.findByOwnerPlatformId;

/** Finds connected accounts by platform and platform ID. */
export const findAccountsByPlatformId = dataStore.accounts.findByPlatformPlatformId;

/** Finds a connected WhatsApp account. */
export const findWhatsAppAccount = dataStore.accounts.findWhatsAppAccount;

/** Creates a new connected account. */
export const createAccount = dataStore.accounts.create;

/** Updates an existing connected account. */
export const updateAccount = dataStore.accounts.update;

/** Deletes a connected account. */
export const deleteAccount = dataStore.accounts.delete;

/** Creates or updates a connected account, matched by owner and platform ID. */
export const upsertAccountByOwnerPlatformId = dataStore.accounts.upsertByOwnerPlatformId;

/** Lists all local accounts stored in this app. */
export const listLocalAccounts = dataStore.localAccounts.list;

/** Fetches a single local account by its ID. */
export const getLocalAccount = dataStore.localAccounts.getById;

/** Updates an existing local account. */
export const updateLocalAccount = dataStore.localAccounts.update;

/**
 * Deletes a connected account from Firestore.
 * @param id The ID of the account document to delete.
 * @returns A result object indicating success or failure, with an error message on failure.
 */
export async function disconnectAccountAction(id: string): Promise<{ success: boolean; error?: string }> {
    if (!id) {
        return { success: false, error: 'No account ID provided.' };
    }
    try {
        await dataStore.accounts.delete(id);
        revalidatePath('/accounts');
        return { success: true };
    } catch (error: any) {
        await logError({
            process: 'disconnectAccountAction',
            location: 'Account Actions',
            errorMessage: error.message,
            context: { accountId: id },
        });
        return { success: false, error: 'Failed to disconnect the account.' };
    }
}

/**
 * Updates the access token for a WhatsApp account.
 * The new token is encrypted before it is stored.
 * @param id The ID of the account document.
 * @param newAccessToken The new access token to store.
 * @returns A result object indicating success or failure, with an error message on failure.
 */
export async function updateWhatsAppTokenAction(id: string, newAccessToken: string): Promise<{ success: boolean; error?: string }> {
    if (!id || !newAccessToken) {
        return { success: false, error: 'Account ID and new token are required.' };
    }
    try {
        const encryptedToken = await encrypt(newAccessToken);
        await dataStore.accounts.update(id, {
            encryptedToken: encryptedToken,
            updatedAt: new Date(),
        });
        revalidatePath(`/accounts/${id}`);
        return { success: true };
    } catch (error: any) {
         await logError({
            process: 'updateWhatsAppTokenAction',
            location: 'Account Actions',
            errorMessage: error.message,
            context: { accountId: id },
        });
        return { success: false, error: 'Failed to update the access token.' };
    }
}
