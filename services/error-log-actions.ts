'use server';

import { dataStore } from '@/core/lib/data-store';
import { revalidatePath } from 'next/cache';

/**
 * Deletes all documents from the 'errors' collection.
 */
export async function clearAllErrorsAction(): Promise<{ success: boolean; error?: string }> {
  try {
    await dataStore.errors.clear();
    revalidatePath('/root/errors'); // Revalidate the page to show it's empty
    return { success: true };
  } catch (error: any) {
    console.error('Error clearing all errors:', error);
    return { success: false, error: 'Failed to clear all errors.' };
  }
}


/**
 * Deletes a single error log document from Firestore.
 * @param id The ID of the error document to delete.
 */
export async function deleteErrorAction(id: string): Promise<{ success: boolean; error?: string }> {
    if (!id) {
        return { success: false, error: 'No ID provided.' };
    }
    try {
        await dataStore.errors.delete(id);
        // Path revalidation will happen on the client via router.push
        return { success: true };
    } catch (error: any) {
        console.error(`Error deleting error log ${id}:`, error);
        return { success: false, error: 'Failed to delete the error log.' };
    }
}
