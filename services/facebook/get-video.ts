'use server';

import { decrypt } from '@/lib/crypto';
import { dataStore } from '@/lib/data-store';
import { logError } from '@/lib/error-logging';
import {
  getWatchableVideoFromPost,
  type FacebookWatchableVideo,
} from '@/services/facebook/getVideo';

const isFacebookPlatform = (platform: string | null | undefined) =>
  (platform ?? '').toLowerCase() === 'facebook';

export type GetFacebookPostVideoResult = {
  success: boolean;
  video?: FacebookWatchableVideo | null;
  error?: string;
};

export async function getFacebookPostVideoAction(
  postId: string
): Promise<GetFacebookPostVideoResult> {
  try {
    const post = await dataStore.posts.getById(postId);
    if (!post?.platformPostId || !isFacebookPlatform(post.platform)) {
      return { success: false, error: 'Post not found or not a Facebook post' };
    }

    const account = post.accountId
      ? await dataStore.accounts.getById(post.accountId)
      : null;

    if (!account?.encryptedToken) {
      return { success: false, error: 'Account credentials not found' };
    }

    const pageToken = await decrypt(account.encryptedToken);
    if (!pageToken) {
      return { success: false, error: 'Unable to decrypt page token' };
    }

    const video = await getWatchableVideoFromPost(post.platformPostId, pageToken);
    return { success: true, video };
  } catch (error) {
    const err = error as Error;
    await logError({
      process: 'Get Facebook Post Video',
      location: 'getFacebookPostVideoAction',
      errorMessage: err.message,
      context: { postId, stack: err.stack },
    });

    return { success: false, error: err.message };
  }
}
