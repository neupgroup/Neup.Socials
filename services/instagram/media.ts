'use server';

import { dataStore } from '@/core/lib/data-store';
import { decrypt } from '@/core/lib/crypto';
import { logError } from '@/core/lib/error-logging';
import { instagramRequest } from '@/services/instagram/comments/shared';

const isInstagramPlatform = (platform: string | null | undefined) =>
  (platform ?? '').toLowerCase() === 'instagram';

type InstagramMediaResponse = {
  id?: string;
  media_type?: string;
  media_product_type?: string;
  permalink?: string;
};

export type InstagramPostMediaResult = {
  success: boolean;
  mediaId?: string;
  mediaType?: string;
  mediaProductType?: string;
  permalink?: string;
  error?: string;
};

export async function getInstagramPostMediaAction(
  postId: string
): Promise<InstagramPostMediaResult> {
  try {
    const post = await dataStore.posts.getById(postId);
    if (!post?.platformPostId || !isInstagramPlatform(post.platform)) {
      return { success: false, error: 'Post not found or not an Instagram post.' };
    }

    const account = post.accountId
      ? await dataStore.accounts.getById(post.accountId)
      : null;

    if (!account?.encryptedToken || !account.platformId) {
      return { success: false, error: 'Instagram account credentials were not found.' };
    }

    const accessToken = await decrypt(account.encryptedToken);
    if (!accessToken) {
      return { success: false, error: 'No valid Instagram access token found.' };
    }

    const media = await instagramRequest<InstagramMediaResponse>(`/${post.platformPostId}`, {
      accessToken,
      query: {
        fields: 'id,media_type,media_product_type,permalink',
      },
    });

    return {
      success: true,
      mediaId: media.id ?? post.platformPostId,
      mediaType: media.media_type,
      mediaProductType: media.media_product_type,
      permalink: media.permalink,
    };
  } catch (error) {
    const err = error as Error;
    await logError({
      process: 'Get Instagram Post Media',
      location: 'getInstagramPostMediaAction',
      errorMessage: err.message,
      context: { postId, stack: err.stack },
    });

    return { success: false, error: err.message };
  }
}
