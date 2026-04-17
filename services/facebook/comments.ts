'use server';

import { dataStore } from '@/core/lib/data-store';
import { decrypt } from '@/core/lib/crypto';
import { logError } from '@/core/lib/error-logging';
import { getPostComments, postCommentOnPost, postReplyToComment } from '@/services/facebook/api';

const isFacebookPlatform = (platform: string | null | undefined) =>
  (platform ?? '').toLowerCase() === 'facebook';

export type FetchCommentsResult = {
  success: boolean;
  comments?: Array<{
    id: string;
    message?: string;
    created_time?: string;
    from?: {
      id: string;
      name: string;
    };
  }>;
  error?: string;
};

export type PostCommentResult = {
  success: boolean;
  commentId?: string;
  error?: string;
};

/**
 * Fetches recent comments on a specific post.
 * Requires the post to be linked to a Facebook account.
 */
export async function fetchPostCommentsAction(
  postId: string
): Promise<FetchCommentsResult> {
  try {
    const post = await dataStore.posts.getById(postId);
    if (!post?.platformPostId || !isFacebookPlatform(post.platform)) {
      return { success: false, error: 'Post not found or not a Facebook post' };
    }

    const account = post.accountId
      ? await dataStore.accounts.getById(post.accountId)
      : null;

    if (!account?.encryptedToken) {
      return { success: false, error: 'Account tokens not found' };
    }

    let pageToken: string | undefined;
    try {
      pageToken = await decrypt(account.encryptedToken);
    } catch {
      return { success: false, error: 'Failed to decrypt account tokens' };
    }

    if (!pageToken) {
      return { success: false, error: 'No valid page token found' };
    }

    const response = await getPostComments(post.platformPostId, pageToken, 50);

    const onProfile = account.platformId ?? '';
    const comments = await Promise.all(
      (response.data || []).map(async (comment) => {
        const commenterId = String(comment?.from?.id ?? '').trim();
        let commenterName = String(comment?.from?.name ?? '').trim();

        if (!commenterName && onProfile && commenterId) {
          const savedCommentor = await dataStore.commentors.findByPlatformProfileAndUser({
            platform: 'facebook',
            onProfile,
            platformUserId: commenterId,
          });
          commenterName = String(savedCommentor?.name ?? '').trim();
        }

        if (!commenterName) {
          commenterName = commenterId ? `Facebook User ${commenterId.slice(-6)}` : 'Facebook User';
        }

        return {
          ...comment,
          from: {
            id: commenterId,
            name: commenterName,
          },
        };
      })
    );

    return {
      success: true,
      comments,
    };
  } catch (error) {
    const err = error as Error;
    await logError({
      process: 'Fetch Facebook Post Comments',
      location: 'fetchPostCommentsAction',
      errorMessage: err.message,
      context: { postId, stack: err.stack },
    });
    return { success: false, error: err.message };
  }
}

/**
 * Posts a comment on a Facebook page post.
 * Comment will be authored by the page.
 */
export async function postCommentAction(
  postId: string,
  message: string,
  mentionedUserIds?: string[]
): Promise<PostCommentResult> {
  try {
    // Build message with @mentions if provided
    let finalMessage = message;
    if (mentionedUserIds && mentionedUserIds.length > 0) {
      const mentions = mentionedUserIds.map(id => `@[${id}]`).join(' ');
      finalMessage = `${message} ${mentions}`;
    }

    const post = await dataStore.posts.getById(postId);
    if (!post?.platformPostId || !isFacebookPlatform(post.platform)) {
      return { success: false, error: 'Post not found or not a Facebook post' };
    }

    const account = post.accountId
      ? await dataStore.accounts.getById(post.accountId)
      : null;

    if (!account?.encryptedToken) {
      return { success: false, error: 'Account tokens not found' };
    }

    let pageToken: string | undefined;
    try {
      pageToken = await decrypt(account.encryptedToken);
    } catch {
      return { success: false, error: 'Failed to decrypt account tokens' };
    }

    if (!pageToken) {
      return { success: false, error: 'No valid page token found' };
    }

    const response = await postCommentOnPost(
      post.platformPostId,
      pageToken,
      finalMessage
    );

    return { success: true, commentId: response.id };
  } catch (error) {
    const err = error as Error;
    await logError({
      process: 'Post Facebook Comment',
      location: 'postCommentAction',
      errorMessage: err.message,
      context: { postId, stack: err.stack },
    });
    return { success: false, error: err.message };
  }
}

/**
 * Posts a reply to a comment on a Facebook page post.
 * Reply will be authored by the page.
 */
export async function postReplyAction(
  commentId: string,
  postId: string,
  message: string,
  mentionedUserIds?: string[]
): Promise<PostCommentResult> {
  try {
    // Build message with @mentions if provided
    let finalMessage = message;
    if (mentionedUserIds && mentionedUserIds.length > 0) {
      const mentions = mentionedUserIds.map(id => `@[${id}]`).join(' ');
      finalMessage = `${message} ${mentions}`;
    }

    const post = await dataStore.posts.getById(postId);
    if (!post?.platformPostId || !isFacebookPlatform(post.platform)) {
      return { success: false, error: 'Post not found or not a Facebook post' };
    }

    const account = post.accountId
      ? await dataStore.accounts.getById(post.accountId)
      : null;

    if (!account?.encryptedToken) {
      return { success: false, error: 'Account tokens not found' };
    }

    let pageToken: string | undefined;
    try {
      pageToken = await decrypt(account.encryptedToken);
    } catch {
      return { success: false, error: 'Failed to decrypt account tokens' };
    }

    if (!pageToken) {
      return { success: false, error: 'No valid page token found' };
    }

    const response = await postReplyToComment(
      commentId,
      pageToken,
      finalMessage
    );

    return { success: true, commentId: response.id };
  } catch (error) {
    const err = error as Error;
    await logError({
      process: 'Post Facebook Comment Reply',
      location: 'postReplyAction',
      errorMessage: err.message,
      context: { commentId, postId, stack: err.stack },
    });
    return { success: false, error: err.message };
  }
}
