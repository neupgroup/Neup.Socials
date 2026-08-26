'use server';

import { dataStore } from '@/core.v2/lib/data-store';
import { logError } from '@/core/lib/error-logging';
import { encrypt } from '@/core/helpers/crypto';
import { revalidatePath } from 'next/cache';

export const listAccounts = dataStore.accounts.list;
export const countAccounts = dataStore.accounts.count;
export const getAccount = dataStore.accounts.getById;
export const getAccountsByIds = dataStore.accounts.getByIds;
export const getWhatsAppAccounts = dataStore.accounts.getWhatsAppAccounts;
export const findAccountByOwnerPlatformId = dataStore.accounts.findByOwnerPlatformId;
export const findAccountsByPlatformId = dataStore.accounts.findByPlatformPlatformId;
export const findWhatsAppAccount = dataStore.accounts.findWhatsAppAccount;
export const createAccount = dataStore.accounts.create;
export const updateAccount = dataStore.accounts.update;
export const deleteAccount = dataStore.accounts.delete;
export const upsertAccountByOwnerPlatformId = dataStore.accounts.upsertByOwnerPlatformId;

/**
 * Deletes a connected account from Firestore.
 * @param id The ID of the account document to delete.
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
 * @param id The ID of the account document.
 * @param newAccessToken The new access token to store.
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
