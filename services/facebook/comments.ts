'use server';

import { dataStore } from '@/core/lib/data-store';
import { decrypt } from '@/core/lib/crypto';
import { logError } from '@/core/lib/error-logging';
import { getPostAnalyticsAction } from '@/services/facebook/post-insights';
import { getPostComments as getPostCommentsWithReplies } from '@/services/facebook/comments-api';
import { postCommentOnPost, postReplyToComment } from '@/services/facebook/api';

const isFacebookPlatform = (platform: string | null | undefined) =>
  (platform ?? '').toLowerCase() === 'facebook';

const COMMENTS_SYNC_KEY = 'commentsSyncedAt';
const COMMENTS_MAX_ITEMS = 3000;
const COMMENTS_TOP_LEVEL_LIMIT = 200;
const COMMENTS_REPLY_LIMIT = 10;

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
  postId: string,
  options?: { refresh?: boolean }
): Promise<FetchCommentsResult> {
  const refresh = options?.refresh ?? false;
  try {
    const post = await dataStore.posts.getById(postId);
    if (!post?.platformPostId || !isFacebookPlatform(post.platform)) {
      return { success: false, error: 'Post not found or not a Facebook post' };
    }

    // Always refresh post analytics from the API so we can decide whether cached comments are stale.
    const analyticsResult = await getPostAnalyticsAction(postId);
    const expectedTotal = analyticsResult.success && analyticsResult.analytics ? analyticsResult.analytics.comments : undefined;

    const analyticsObject =
      post.analytics && typeof post.analytics === 'object' ? (post.analytics as Record<string, unknown>) : {};
    const lastExpectedRaw = analyticsObject.commentsExpected;
    const lastExpected = typeof lastExpectedRaw === 'number' ? lastExpectedRaw : undefined;
    const lastSyncedAtRaw = analyticsObject[COMMENTS_SYNC_KEY];
    const lastSyncedAt =
      typeof lastSyncedAtRaw === 'string' && lastSyncedAtRaw ? new Date(lastSyncedAtRaw) : null;

    // Only attempt to use cache if we are not forcing a refresh.
    if (!refresh) {
      try {
        const cached = await dataStore.postComments.listByPostId({ postId, take: COMMENTS_MAX_ITEMS });
        const cachedCurrent = lastSyncedAt
          ? cached.filter((comment) => comment.updatedAt >= lastSyncedAt)
          : cached;

        if (cachedCurrent.length > 0) {
          const expectedInCache =
            typeof expectedTotal === 'number' ? Math.min(expectedTotal, COMMENTS_MAX_ITEMS) : undefined;

          const countsUnchangedSinceLastSync =
            lastSyncedAt !== null && lastExpected !== undefined && expectedTotal === lastExpected;

          if (expectedInCache === undefined || cachedCurrent.length === expectedInCache || countsUnchangedSinceLastSync) {
            return {
              success: true,
              comments: cachedCurrent.map((comment) => ({
                id: comment.commentId,
                message: comment.commentText ?? '',
                created_time: comment.commentedOn.toISOString(),
                from: {
                  id: comment.commenterId ?? '',
                  name: comment.commenterName ?? 'Facebook User',
                },
              })),
            };
          }
        }
      } catch (cacheError) {
        // Log and continue to live fetch if cache fails (e.g. table doesn't exist)
        console.warn('Failed to read from comments cache, falling back to API:', cacheError);
      }
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

    const syncedAt = new Date();
    const response = await getPostCommentsWithReplies(post.platformPostId, pageToken, {
      limit: COMMENTS_TOP_LEVEL_LIMIT,
      includeReplies: true,
    });

    const onProfile = account.platformId ?? '';
    const normalizeFrom = async (input?: { id?: string; name?: string }) => {
      const commenterId = String(input?.id ?? '').trim();
      let commenterName = String(input?.name ?? '').trim();

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

      return { id: commenterId, name: commenterName };
    };

    const topLevel = response.data || [];
    const normalizedTopLevel = await Promise.all(
      topLevel.map(async (comment) => ({
        ...comment,
        from: await normalizeFrom(comment.from),
      }))
    );

    const flattened = (
      await Promise.all(
        normalizedTopLevel.flatMap(async (comment) => {
          const items: Array<{
            id: string;
            message?: string;
            created_time?: string;
            from?: { id: string; name: string };
          }> = [];

          if (comment.id) {
            items.push({
              id: comment.id,
              message: comment.message,
              created_time: comment.created_time,
              from: comment.from,
            });
          }

          const replies = comment.comments?.data ?? [];
          const normalizedReplies = await Promise.all(
            replies.slice(0, COMMENTS_REPLY_LIMIT).map(async (reply) => ({
              ...reply,
              from: await normalizeFrom(reply.from),
            }))
          );

          for (const reply of normalizedReplies) {
            if (!reply.id) continue;
            items.push({
              id: reply.id,
              message: reply.message,
              created_time: reply.created_time,
              from: reply.from,
            });
          }

          return items;
        })
      )
    ).flat();

    try {
      await Promise.all(
        flattened.map(async (comment) => {
          if (!comment.id) {
            return;
          }

          const commentedOn = comment.created_time ? new Date(comment.created_time) : new Date();

          await dataStore.postComments.upsertByCommentId({
            commentId: comment.id,
            postId,
            platform: 'facebook',
            commentedOn,
            commenterId: comment.from?.id ?? null,
            commenterName: comment.from?.name ?? null,
            commentText: comment.message ?? null,
            seenAt: syncedAt,
          });
        })
      );
    } catch (upsertError) {
      console.warn('Failed to upsert comments to cache:', upsertError);
    }

    // Store a sync marker on the post so we can distinguish "current" comments from deleted ones.
    const latestPost = await dataStore.posts.getById(postId);
    const latestAnalytics =
      latestPost?.analytics && typeof latestPost.analytics === 'object'
        ? (latestPost.analytics as Record<string, unknown>)
        : {};

    await dataStore.posts.update(postId, {
      analytics: {
        ...latestAnalytics,
        [COMMENTS_SYNC_KEY]: syncedAt.toISOString(),
        commentsFetched: flattened.length,
        commentsFetchedTopLevel: normalizedTopLevel.length,
        ...(typeof expectedTotal === 'number' ? { commentsExpected: expectedTotal } : {}),
      },
    });

    // If database was successfully updated, we return from database to ensure consistency (and potentially including previous comments)
    // but if database fails, we return the flattened results directly.
    try {
      const refreshed = await dataStore.postComments.listByPostId({ postId, take: COMMENTS_MAX_ITEMS });
      const refreshedCurrent = refreshed.filter((comment) => comment.updatedAt >= syncedAt);

      if (refreshedCurrent.length > 0) {
        return {
          success: true,
          comments: refreshedCurrent.map((comment) => ({
            id: comment.commentId,
            message: comment.commentText ?? '',
            created_time: comment.commentedOn.toISOString(),
            from: {
              id: comment.commenterId ?? '',
              name: comment.commenterName ?? 'Facebook User',
            },
          })),
        };
      }
    } catch (finalQueryError) {
      console.warn('Failed to query refreshed comments from cache:', finalQueryError);
    }

    // Fallback: return the results from the API directly
    return {
      success: true,
      comments: flattened.map((comment) => ({
        id: comment.id,
        message: comment.message ?? '',
        created_time: comment.created_time,
        from: comment.from,
      })),
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
