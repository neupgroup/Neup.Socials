/**
 * @fileoverview Server-side action for retrieving watchable video
 * information associated with Facebook posts stored in the application.
 *
 * Coordinates post retrieval, platform validation, account credential
 * retrieval, token decryption, Facebook video retrieval, and error logging.
 *
 * Acts as an intermediary between the application's data repositories
 * and the Facebook video retrieval service.
 *
 * @module services/facebook/get-videos
 */

'use server';

import { decrypt } from '@neup/core/helpers/crypto';
import { dataStore } from '@/services/repositories';
import { logError } from '@/services/error-logging';
import {
  getWatchableVideoFromPost,
  type FacebookWatchableVideo,
} from '@/services/facebook/getVideo';

/**
 * Determines whether the supplied platform identifier represents Facebook.
 *
 * Performs a case-insensitive comparison and safely handles null
 * or undefined platform identifiers.
 *
 * @param platform - Platform identifier associated with a post.
 *
 * @returns True when the platform identifier is Facebook;
 * otherwise, false.
 */
const isFacebookPlatform = (platform: string | null | undefined) =>
  (platform ?? '').toLowerCase() === 'facebook';

/**
 * Represents the result of a Facebook post video retrieval operation.
 *
 * Contains the operation status, optional watchable video information,
 * and an optional error message.
 */
export type GetFacebookPostVideoResult = {
  /** Indicates whether the retrieval operation completed successfully. */
  success: boolean;

  /**
   * Watchable Facebook video information.
   *
   * May be null when the retrieval service returns no video,
   * even if the operation itself completed successfully.
   */
  video?: FacebookWatchableVideo | null;

  /** Error message describing an unsuccessful retrieval operation. */
  error?: string;
};

/**
 * Retrieves watchable video information for a Facebook post stored
 * in the application's data repository.
 *
 * Looks up the post using its internal identifier and verifies that
 * it belongs to Facebook and has an associated platform post identifier.
 *
 * Retrieves the associated social account, decrypts its stored access
 * token, and delegates video retrieval to the Facebook video service.
 *
 * Exceptions encountered during retrieval are recorded through the
 * application's error-logging service.
 *
 * @param postId - Internal application identifier of the post.
 * This is not the Facebook Graph API post identifier.
 *
 * @returns A promise resolving to the operation status and either
 * the retrieved video information or an error message.
 *
 * @remarks
 * Returns an unsuccessful result when:
 * - The post does not exist or has no platform post identifier.
 * - The post does not belong to Facebook.
 * - The associated account or encrypted credentials are unavailable.
 * - The account token cannot be decrypted into a usable value.
 * - An exception occurs during the retrieval process.
 *
 * A successful result indicates that the retrieval operation completed,
 * but does not guarantee that watchable video information exists.
 *
 * Unexpected exceptions are logged with the internal post identifier
 * and available stack trace before returning an unsuccessful result.
 *
 * @throws May reject if the error-logging operation itself fails.
 *
 * @see getWatchableVideoFromPost
 * @see logError
 */
export async function getFacebookPostVideoAction(
  postId: string
): Promise<GetFacebookPostVideoResult> {
  try {
    // Retrieve the stored post and validate its Facebook association.
    const post = await dataStore.posts.getById(postId);
    if (!post?.platformPostId || !isFacebookPlatform(post.platform)) {
      return { success: false, error: 'Post not found or not a Facebook post' };
    }

    // Retrieve the social account associated with the stored post.
    const account = post.accountId
      ? await dataStore.accounts.getById(post.accountId)
      : null;

    if (!account?.encryptedToken) {
      return { success: false, error: 'Account credentials not found' };
    }

    // Decrypt the stored account token for Facebook API authentication.
    const pageToken = await decrypt(account.encryptedToken);
    if (!pageToken) {
      return { success: false, error: 'Unable to decrypt page token' };
    }

    // Retrieve watchable video information using the external Facebook post ID.
    const video = await getWatchableVideoFromPost(post.platformPostId, pageToken);
    return { success: true, video };
  } catch (error) {
    const err = error as Error;

    // Record unexpected retrieval failures for application diagnostics.
    await logError({
      process: 'Get Facebook Post Video',
      location: 'getFacebookPostVideoAction',
      errorMessage: err.message,
      context: { postId, stack: err.stack },
    });

    return { success: false, error: err.message };
  }
}
