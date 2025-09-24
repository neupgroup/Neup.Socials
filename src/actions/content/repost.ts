'use server';

import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logError } from '@/lib/error-logging';

/**
 * Creates a duplicate of an existing post.
 * The new post will be a draft with the same content and media.
 * @param originalPostId The ID of the post to duplicate.
 * @returns An object indicating success and the new post's ID.
 */
export async function repostAction(originalPostId: string): Promise<{
  success: boolean;
  newPostId?: string;
  error?: string;
}> {
  try {
    const originalPostRef = doc(db, 'content', originalPostId);
    const originalPostSnap = await getDoc(originalPostRef);

    if (!originalPostSnap.exists()) {
      throw new Error('Original post not found.');
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
      originalPostId: originalPostId, // Keep a reference to the original
    };

    const newPostRef = await addDoc(collection(db, 'content'), newPostData);

    return { success: true, newPostId: newPostRef.id };
  } catch (error: any) {
    console.error(`[repostAction] Error duplicating post ${originalPostId}:`, error);
    await logError({
      process: 'repostAction',
      location: 'Repost Content Action',
      errorMessage: error.message,
      context: { originalPostId },
    });
    return { success: false, error: error.message };
  }
}
