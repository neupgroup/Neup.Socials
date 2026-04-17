'use server';

import { dataStore } from '@/lib/data-store';
import { decrypt } from '@/lib/crypto';
import { logError } from '@/lib/error-logging';
import { getInstagramMediaComments } from '@/services/instagram/comments/get-comments';
import { getInstagramCommentReplies } from '@/services/instagram/comments/get-comment-replies';
import { replyToInstagramComment } from '@/services/instagram/comments/reply-comment';
import { setInstagramCommentHidden } from '@/services/instagram/comments/hide-comment';
import { deleteInstagramComment } from '@/services/instagram/comments/delete-comment';
import { setInstagramMediaCommentsEnabled } from '@/services/instagram/comments/disable-enable-comment';
import { instagramRequest } from '@/services/instagram/comments/shared';
import { sendInstagramPrivateReply } from '@/services/instagram/private-reply';

const isInstagramPlatform = (platform: string | null | undefined) =>
  (platform ?? '').toLowerCase() === 'instagram';

export type InstagramModerationReply = {
  id: string;
  text: string;
  timestamp?: string;
  username: string;
  hidden: boolean;
  likeCount: number;
};

export type InstagramModerationComment = {
  id: string;
  text: string;
  timestamp?: string;
  username: string;
  hidden: boolean;
  likeCount: number;
  replies: InstagramModerationReply[];
};

type InstagramCommentsEnabledResponse = {
  comment_enabled?: boolean;
};

type InstagramCommentsResult = {
  success: boolean;
  comments?: InstagramModerationComment[];
  commentsEnabled?: boolean;
  error?: string;
};

type InstagramRepliesResult = {
  success: boolean;
  replies?: InstagramModerationReply[];
  error?: string;
};

type InstagramActionResult = {
  success: boolean;
  error?: string;
};

type InstagramPrivateReplyResult = {
  success: boolean;
  recipientId?: string;
  messageId?: string;
  error?: string;
};

async function getInstagramPostContext(postId: string) {
  const post = await dataStore.posts.getById(postId);
  if (!post?.platformPostId || !isInstagramPlatform(post.platform)) {
    throw new Error('Post not found or not an Instagram post.');
  }

  const account = post.accountId
    ? await dataStore.accounts.getById(post.accountId)
    : null;

  if (!account?.encryptedToken || !account.platformId) {
    throw new Error('Instagram account credentials were not found.');
  }

  const accessToken = await decrypt(account.encryptedToken);
  if (!accessToken) {
    throw new Error('No valid Instagram access token found.');
  }

  return {
    post,
    account,
    accessToken,
  };
}

function mapInstagramReply(reply: {
  id: string;
  text?: string;
  timestamp?: string;
  username?: string;
  hidden?: boolean;
  like_count?: number;
}): InstagramModerationReply {
  return {
    id: reply.id,
    text: reply.text ?? '',
    timestamp: reply.timestamp,
    username: reply.username?.trim() || 'Instagram User',
    hidden: Boolean(reply.hidden),
    likeCount: reply.like_count ?? 0,
  };
}

function mapInstagramComment(comment: {
  id: string;
  text?: string;
  timestamp?: string;
  username?: string;
  hidden?: boolean;
  like_count?: number;
  replies?: {
    data?: Array<{
      id: string;
      text?: string;
      timestamp?: string;
      username?: string;
      hidden?: boolean;
      like_count?: number;
    }>;
  };
}): InstagramModerationComment {
  return {
    id: comment.id,
    text: comment.text ?? '',
    timestamp: comment.timestamp,
    username: comment.username?.trim() || 'Instagram User',
    hidden: Boolean(comment.hidden),
    likeCount: comment.like_count ?? 0,
    replies: (comment.replies?.data ?? []).map(mapInstagramReply),
  };
}

export async function fetchInstagramPostCommentsAction(postId: string): Promise<InstagramCommentsResult> {
  try {
    const { post, accessToken } = await getInstagramPostContext(postId);

    const commentsResponse = await getInstagramMediaComments(post.platformPostId!, accessToken, {
      limit: 50,
      fields:
        'id,text,timestamp,username,hidden,like_count,parent_id,replies.limit(10){id,text,timestamp,username,hidden,like_count,parent_id}',
    });

    let commentsEnabled: boolean | undefined;
    try {
      const settingsResponse = await instagramRequest<InstagramCommentsEnabledResponse>(
        `/${post.platformPostId}`,
        {
          accessToken,
          query: {
            fields: 'comment_enabled',
          },
        }
      );
      commentsEnabled = settingsResponse.comment_enabled;
    } catch {
      commentsEnabled = undefined;
    }

    return {
      success: true,
      comments: (commentsResponse.data ?? []).map(mapInstagramComment),
      commentsEnabled,
    };
  } catch (error) {
    const err = error as Error;
    await logError({
      process: 'Fetch Instagram Post Comments',
      location: 'fetchInstagramPostCommentsAction',
      errorMessage: err.message,
      context: { postId, stack: err.stack },
    });
    return { success: false, error: err.message };
  }
}

export async function fetchInstagramCommentRepliesAction(
  postId: string,
  commentId: string
): Promise<InstagramRepliesResult> {
  try {
    const { accessToken } = await getInstagramPostContext(postId);
    const response = await getInstagramCommentReplies(commentId, accessToken, {
      limit: 25,
      fields: 'id,text,timestamp,username,hidden,like_count,parent_id',
    });

    return {
      success: true,
      replies: (response.data ?? []).map(mapInstagramReply),
    };
  } catch (error) {
    const err = error as Error;
    await logError({
      process: 'Fetch Instagram Comment Replies',
      location: 'fetchInstagramCommentRepliesAction',
      errorMessage: err.message,
      context: { postId, commentId, stack: err.stack },
    });
    return { success: false, error: err.message };
  }
}

export async function replyToInstagramCommentAction(
  postId: string,
  commentId: string,
  message: string
): Promise<InstagramActionResult> {
  try {
    const { accessToken } = await getInstagramPostContext(postId);
    await replyToInstagramComment(commentId, accessToken, message);
    return { success: true };
  } catch (error) {
    const err = error as Error;
    await logError({
      process: 'Reply To Instagram Comment',
      location: 'replyToInstagramCommentAction',
      errorMessage: err.message,
      context: { postId, commentId, stack: err.stack },
    });
    return { success: false, error: err.message };
  }
}

export async function sendInstagramCommentMessageAction(
  postId: string,
  commentId: string,
  message: string
): Promise<InstagramPrivateReplyResult> {
  try {
    const { account, accessToken } = await getInstagramPostContext(postId);
    const result = await sendInstagramPrivateReply(account.platformId!, accessToken, commentId, message);

    return {
      success: true,
      recipientId: result.recipientId,
      messageId: result.messageId,
    };
  } catch (error) {
    const err = error as Error;
    await logError({
      process: 'Send Instagram Private Reply',
      location: 'sendInstagramCommentMessageAction',
      errorMessage: err.message,
      context: { postId, commentId, stack: err.stack },
    });
    return { success: false, error: err.message };
  }
}

export async function setInstagramCommentHiddenAction(
  postId: string,
  commentId: string,
  hidden: boolean
): Promise<InstagramActionResult> {
  try {
    const { accessToken } = await getInstagramPostContext(postId);
    await setInstagramCommentHidden(commentId, accessToken, hidden);
    return { success: true };
  } catch (error) {
    const err = error as Error;
    await logError({
      process: hidden ? 'Hide Instagram Comment' : 'Unhide Instagram Comment',
      location: 'setInstagramCommentHiddenAction',
      errorMessage: err.message,
      context: { postId, commentId, hidden, stack: err.stack },
    });
    return { success: false, error: err.message };
  }
}

export async function deleteInstagramCommentAction(
  postId: string,
  commentId: string
): Promise<InstagramActionResult> {
  try {
    const { accessToken } = await getInstagramPostContext(postId);
    await deleteInstagramComment(commentId, accessToken);
    return { success: true };
  } catch (error) {
    const err = error as Error;
    await logError({
      process: 'Delete Instagram Comment',
      location: 'deleteInstagramCommentAction',
      errorMessage: err.message,
      context: { postId, commentId, stack: err.stack },
    });
    return { success: false, error: err.message };
  }
}

export async function setInstagramCommentsEnabledAction(
  postId: string,
  enabled: boolean
): Promise<InstagramActionResult> {
  try {
    const { post, accessToken } = await getInstagramPostContext(postId);
    await setInstagramMediaCommentsEnabled(post.platformPostId!, accessToken, enabled);
    return { success: true };
  } catch (error) {
    const err = error as Error;
    await logError({
      process: enabled ? 'Enable Instagram Comments' : 'Disable Instagram Comments',
      location: 'setInstagramCommentsEnabledAction',
      errorMessage: err.message,
      context: { postId, enabled, stack: err.stack },
    });
    return { success: false, error: err.message };
  }
}
