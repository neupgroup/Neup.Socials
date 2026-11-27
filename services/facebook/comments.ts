/**
 * @fileoverview Server-side actions for retrieving, caching, publishing,
 * and replying to Facebook post comments using connected account credentials.
 * @module services/facebook/comments
 */
'use server';

import { dataStore } from '@/services/repositories';
import { decrypt } from '@neup/core/helpers/crypto';
import { logError } from '@/services/error-logging';
import { getPostAnalyticsAction } from '@/services/facebook/post-insights';
import { getPostComments as getPostCommentsWithReplies } from '@/services/facebook/comments-api';
import { postCommentOnPost, postReplyToComment } from '@/services/facebook/api';

/**
 * Checks whether a platform identifier represents Facebook, ignoring case.
 * @param platform - Platform identifier, which may be null or undefined.
 * @returns Whether the identifier matches Facebook.
 */
const isFacebookPlatform = (platform: string | null | undefined) =>
  (platform ?? '').toLowerCase() === 'facebook';

/** Analytics property storing the latest comment synchronization timestamp. */
const COMMENTS_SYNC_KEY = 'commentsSyncedAt';
/** Maximum number of cached comments requested per repository query. */
const COMMENTS_MAX_ITEMS = 3000;
/** Requested limit for top-level comments in a live API request. */
const COMMENTS_TOP_LEVEL_LIMIT = 200;
/** Maximum number of returned replies processed per top-level comment. */
const COMMENTS_REPLY_LIMIT = 10;

/** Result of a comment retrieval operation, including optional flattened comments or an error. */
export type FetchCommentsResult = {
  success: boolean;
  comments?: Array<{
    id: string;
    message?: string;
    created_time?: string;
    from?: {
      id: string;
      name: string;
      picture?: { data?: { url?: string } };
    };
    parentId?: string;
  }>;
  error?: string;
};

/** Result of a comment or reply publication operation. */
export type PostCommentResult = {
  success: boolean;
  commentId?: string;
  error?: string;
};

/**
 * Retrieves comments for a stored Facebook post using cached or live data.
 *
 * Refreshes post analytics to assess cache freshness. Unless refresh is
 * forced, returns nonempty cached results when the expected count is unknown,
 * matches the cached count, or is unchanged since the previous sync.
 * Otherwise, resolves and decrypts the connected account token, fetches
 * comments with replies, normalizes author names, and flattens the results.
 * Attempts to upsert comments and records synchronization metadata.
 *
 * @param postId - Internal application identifier of the stored post.
 * @param options - Optional retrieval configuration.
 * @param options.refresh - Bypasses cached results when true. Defaults to false.
 * @returns A promise resolving to a success status with comments or an error.
 * @throws May reject if error logging fails while handling an exception.
 * @remarks Live results include parent identifiers for replies; cached results
 * do not reconstruct these identifiers. Cache failures are logged as warnings.
 * Live retrieval does not automatically traverse API pagination.
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
                  id: String((comment.commenter as { id?: string } | null)?.id ?? ''),
                  name: String((comment.commenter as { name?: string } | null)?.name ?? 'Facebook User'),
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
    /**
     * Normalizes author identifiers and names, using stored commenter data
     * or a generated display name when the API supplies no name.
     * @param input - Optional author information from the API.
     * @returns A promise resolving to the normalized author identifier and name.
     */
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
            from?: { id: string; name: string; picture?: { data?: { url?: string } } };
            parentId?: string;
            commenter?: { id: string; name: string; image: string | null };
          }> = [];

          if (comment.id) {
            items.push({
              id: comment.id,
              message: comment.message,
              created_time: comment.created_time,
              from: comment.from,
              commenter: {
                id: comment.from?.id ?? '',
                name: comment.from?.name ?? 'Facebook User',
                image: comment.from?.picture?.data?.url ?? null,
              },
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
              parentId: comment.id,
              commenter: {
                id: reply.from?.id ?? '',
                name: reply.from?.name ?? 'Facebook User',
                image: reply.from?.picture?.data?.url ?? null,
              },
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
            commenter: {
              id: comment.from?.id ?? '',
              name: comment.from?.name ?? 'Facebook User',
              image: null,
            },
            commentText: comment.message ?? null,
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

    // Check the refreshed cache; both successful paths return the flattened API results.
    try {
      const refreshed = await dataStore.postComments.listByPostId({ postId, take: COMMENTS_MAX_ITEMS });
      const refreshedCurrent = refreshed.filter((comment) => comment.updatedAt >= syncedAt);

      if (refreshedCurrent.length > 0) {
        return {
          success: true,
          comments: flattened,
        };
      }
    } catch (finalQueryError) {
      console.warn('Failed to query refreshed comments from cache:', finalQueryError);
    }

    // Fallback: return the results from the API directly
    return {
      success: true,
      comments: flattened,
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
 * Submits a comment as the connected Facebook Page.
 * Resolves the stored post and account, decrypts the access token, and
 * appends supplied user mentions before delegating to the API service.
 *
 * @param postId - Internal application identifier of the stored post.
 * @param message - Text content to publish.
 * @param mentionedUserIds - Optional user identifiers appended as @[ID] mentions.
 * @returns A promise resolving to the operation status, returned comment ID,
 * or an error message.
 * @throws May reject if error logging fails while handling an exception.
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
 * Submits a reply as the connected Facebook Page.
 * Resolves the stored post and account, decrypts the access token, and
 * appends supplied user mentions before delegating to the API service.
 *
 * @param commentId - Facebook identifier of the comment targeted by the reply.
 * @param postId - Internal application identifier of the stored post.
 * @param message - Text content to publish.
 * @param mentionedUserIds - Optional user identifiers appended as @[ID] mentions.
 * @returns A promise resolving to the operation status, returned comment ID,
 * or an error message.
 * @throws May reject if error logging fails while handling an exception.
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
