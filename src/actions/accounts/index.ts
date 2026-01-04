'use server';

import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logError } from '@/lib/error-logging';
import { encrypt } from '@/lib/crypto';
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
        await deleteDoc(doc(db, 'connected_accounts', id));
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
        const docRef = doc(db, 'connected_accounts', id);
        await updateDoc(docRef, {
            encryptedToken: encryptedToken,
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
