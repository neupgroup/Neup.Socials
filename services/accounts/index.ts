'use server';

import { dataStore } from '@/core/lib/data-store';
import { logError } from '@/core/lib/error-logging';
import { encrypt } from '@/core/lib/crypto';
import { revalidatePath } from 'next/cache';

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
