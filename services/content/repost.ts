
'use server';

import { dataStore } from '@/core/lib/data-store';
import { logError } from '@/core/lib/error-logging';

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
    const originalData = await dataStore.postCollections.getById(originalPostCollectionId);

    if (!originalData) {
      throw new Error('Original post collection not found.');
    }

    const newPost = await dataStore.postCollections.create({
      content: originalData.content,
      mediaUrls: originalData.mediaUrls || [],
      author: originalData.author,
      status: 'Draft',
      platforms: [],
      accountIds: [],
      createdAt: new Date(),
      scheduledAt: null,
      publishedAt: null,
      postsId: [],
      originalPostCollectionId,
      ctaType: originalData.ctaType,
      ctaLink: originalData.ctaLink,
    });

    return { success: true, newPostId: newPost.id };
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

    
