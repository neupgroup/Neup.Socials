'use server';

import { publishContent } from '../../services/publishing';

/**
 * The result returned by the publish action.
 * @property success Whether the publish request was accepted without error.
 * @property message A human-readable summary of the outcome.
 * @property error The caught error, present only when publishing fails.
 */
interface PublishResult {
  success: boolean;
  message: string;
  error?: any;
}

/**
 * Server action to trigger the publishing of a post collection.
 * @param postCollectionId The ID of the postCollection document in Firestore.
 * @returns A result object indicating success or failure, with error information if the operation fails.
 */
export async function publishPostAction(postCollectionId: string): Promise<PublishResult> {
  try {
    await publishContent(postCollectionId);
    return {
      success: true,
      message: 'Post is being published.',
    };
  } catch (error: any) {
    console.error(`[publishPostAction] Error publishing post collection ${postCollectionId}:`, error);
    // The error is already logged in the service layer, but we could add more context here if needed.
    return {
      success: false,
      message: error.message || 'An unknown error occurred during publishing.',
      error: error,
    };
  }
}
