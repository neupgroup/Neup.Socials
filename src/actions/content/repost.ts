
'use server';

import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logError } from '@/lib/error-logging';

/**
 * Creates a duplicate of an existing post collection.
 * The new post collection will be a draft with the same content and media.
 * @param originalPostCollectionId The ID of the post collection to duplicate.
 * @returns An object indicating success and the new post collection's ID.
 */
export async function repostAction(originalPostCollectionId: string): Promise<{
  success: boolean;
  newPostId?: string;
  error?: string;
}> {
  try {
    const originalPostRef = doc(db, 'postCollections', originalPostCollectionId);
    const originalPostSnap = await getDoc(originalPostRef);

    if (!originalPostSnap.exists()) {
      throw new Error('Original post collection not found.');
    }

    const originalData = originalPostSnap.data();

    // Create a new post object, resetting status and schedule
    const newPostData = {
      content: originalData.content,
      mediaUrls: originalData.mediaUrls || [],
      author: originalData.author, // Keep the original author
      status: 'Draft',
      platforms: [],
      accountIds: [],
      createdAt: serverTimestamp(),
      scheduledAt: null,
      publishedAt: null,
      postsId: [],
      originalPostCollectionId: originalPostCollectionId, // Keep a reference to the original
    };

    const newPostRef = await addDoc(collection(db, 'postCollections'), newPostData);

    return { success: true, newPostId: newPostRef.id };
  } catch (error: any) {
    console.error(`[repostAction] Error duplicating post ${originalPostCollectionId}:`, error);
    await logError({
      process: 'repostAction',
      location: 'Repost Content Action',
      errorMessage: error.message,
      context: { originalPostCollectionId },
    });
    return { success: false, error: error.message };
  }
}

    