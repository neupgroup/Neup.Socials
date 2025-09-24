'use server';

import { publishContent } from '@/services/publishing';

interface PublishResult {
  success: boolean;
  message: string;
  error?: any;
}

/**
 * Server action to trigger the publishing of a post.
 * @param postId The ID of the post document in Firestore.
 * @returns A result object indicating success or failure.
 */
export async function publishPostAction(postId: string): Promise<PublishResult> {
  try {
    await publishContent(postId);
    return {
      success: true,
      message: 'Post is being published.',
    };
  } catch (error: any) {
    console.error(`[publishPostAction] Error publishing post ${postId}:`, error);
    // The error is already logged in the service layer, but we could add more context here if needed.
    return {
      success: false,
      message: error.message || 'An unknown error occurred during publishing.',
      error: error,
    };
  }
}
