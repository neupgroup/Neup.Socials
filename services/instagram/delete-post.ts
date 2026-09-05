'use server';

import { dataStore } from '@/services/repositories';
import { decrypt } from '#/core/helpers/crypto';
import { instagramRequest } from '@/services/instagram/comments/shared';

type InstagramDeleteResponse = {
  success: boolean;
};

export type DeleteInstagramPostResult = {
  success: boolean;
  mediaId?: string;
  error?: string;
};

export type InstagramPostAvailability = {
  exists: boolean;
  mediaId?: string;
  error?: string;
};

/** Checks whether the local Instagram post still exists on Instagram. */
export async function checkInstagramPostExists(postId: string): Promise<InstagramPostAvailability> {
  try {
    const post = await dataStore.posts.getById(postId);
    if (!post?.platformPostId || post.platform?.toLowerCase() !== 'instagram' || !post.accountId) {
      return { exists: false, error: 'Instagram post not found locally.' };
    }

    const account = await dataStore.accounts.getById(post.accountId);
    if (!account?.encryptedToken) {
      return { exists: false, mediaId: post.platformPostId, error: 'Instagram account credentials were not found.' };
    }

    const accessToken = await decrypt(account.encryptedToken);
    const media = await instagramRequest<{ id?: string }>(`/${post.platformPostId}?fields=id,media_type,permalink,timestamp`, {
      accessToken,
    });

    return { exists: Boolean(media.id), mediaId: post.platformPostId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Instagram post could not be checked.';
    console.warn('[Instagram Publishing] Media availability check failed', { postId, errorMessage: message });
    return { exists: false, error: message };
  }
}

/**
 * Deletes an Instagram media object using the token belonging to its connected account.
 * The local Post record is intentionally preserved until the caller confirms cleanup.
 */
export async function deleteInstagramPost(postId: string): Promise<DeleteInstagramPostResult> {
  try {
    const post = await dataStore.posts.getById(postId);

    if (!post?.platformPostId || post.platform?.toLowerCase() !== 'instagram') {
      return { success: false, error: 'Instagram post not found.' };
    }

    if (!post.accountId) {
      return { success: false, error: 'The Instagram post has no connected account.' };
    }

    const account = await dataStore.accounts.getById(post.accountId);
    if (!account?.encryptedToken) {
      return { success: false, error: 'Instagram account credentials were not found.' };
    }

    const accessToken = await decrypt(account.encryptedToken);
    if (!accessToken) {
      return { success: false, error: 'No valid Instagram access token found.' };
    }

    console.info('[Instagram Publishing] Deleting media', {
      postId,
      mediaId: post.platformPostId,
      accountId: post.accountId,
    });

    const response = await instagramRequest<InstagramDeleteResponse>(`/${post.platformPostId}`, {
      method: 'DELETE',
      accessToken,
    });

    if (!response.success) {
      return { success: false, mediaId: post.platformPostId, error: 'Instagram did not confirm deletion.' };
    }

    console.info('[Instagram Publishing] Media deleted', {
      postId,
      mediaId: post.platformPostId,
    });

    return { success: true, mediaId: post.platformPostId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete Instagram post.';
    console.error('[Instagram Publishing] Media deletion failed', {
      postId,
      errorMessage: message,
    });
    return { success: false, error: message };
  }
}
