/**
 * @fileoverview Server-side actions for retrieving and organizing
 * Facebook inbox comments, messages, and conversation summaries.
 *
 * Combines persisted comments, connected accounts, posts, conversations,
 * and messages into a unified inbox feed.
 *
 * Provides comment-specific inbox views and evaluates comment reply
 * eligibility using an application-defined reply window.
 *
 * @module services/facebook/inbox
 */

'use server';

import { logError } from '@/services/error-logging';
import {
  getFacebookInboxAccount,
  getFacebookInboxAccounts,
  getFacebookInboxComment,
  getFacebookInboxPosts,
  listFacebookInboxAccounts,
  listFacebookInboxComments,
  listFacebookInboxConversations,
  listFacebookInboxMessages,
} from '@/services/facebook/inbox-data';

/**
 * Represents a normalized item within the unified Facebook inbox.
 *
 * Supports both conversation-based messages and independently
 * retrieved Facebook post comments.
 */
export type FacebookInboxItem = {
  /** Generated identifier used to distinguish inbox items. */
  id: string;

  /** Classification of the inbox item. */
  type: 'message' | 'comment';

  /** Internal identifier of the associated connected account. */
  accountId: string;

  /** External Facebook Page identifier. */
  pageId: string;

  /** Display name of the associated Facebook Page. */
  pageName: string;

  /** External identifier of the commenter or conversation contact. */
  fromId: string;

  /** Display name of the commenter or conversation contact. */
  fromName: string;

  /** Optional profile picture URL of the associated user. */
  fromProfilePic?: string;

  /** Text content of the message or comment. */
  text: string;

  /** ISO-formatted creation timestamp of the inbox item. */
  createdTime: string;

  /** External Facebook comment identifier, when applicable. */
  commentId?: string;

  /** Internal identifier of the associated post, when applicable. */
  postId?: string;

  /** Text content of the associated Facebook post. */
  postMessage?: string;

  /** Optional permanent URL of the associated Facebook post. */
  postPermalinkUrl?: string;
};

/**
 * Application-defined duration, in hours, during which a comment
 * is considered eligible for a reply.
 *
 * This threshold is used for inbox filtering and reply eligibility
 * indicators rather than enforcing Facebook API messaging policies.
 */
const REPLY_WINDOW_HOURS = 24;

/**
 * Determines whether a comment falls within the configured reply window.
 *
 * Compares the elapsed time since the comment was published against
 * the configured duration in milliseconds.
 *
 * @param commentedOn - Original publication timestamp of the comment.
 *
 * @returns True when the elapsed time does not exceed the configured
 * reply window; otherwise, false.
 *
 * @remarks
 * The comparison includes the exact reply window boundary.
 * This function does not verify reply eligibility with Facebook.
 */
const isReplyWindowOpen = (commentedOn: Date) => {
  const windowMs = REPLY_WINDOW_HOURS * 60 * 60 * 1000;
  return Date.now() - commentedOn.getTime() <= windowMs;
};

/**
 * Represents the result of retrieving a comment-specific inbox view.
 *
 * Contains associated account information, commenter details,
 * original post content, and calculated reply eligibility.
 */
export type FacebookCommentInboxView = {
  /** Indicates whether the inbox view was retrieved successfully. */
  success: boolean;

  /** Internal identifier of the connected account. */
  accountId?: string;

  /** External identifier of the Facebook Page. */
  pageId?: string;

  /** Display name of the Facebook Page. */
  pageName?: string;

  /** External identifier of the comment author. */
  commenterId?: string;

  /** Display name of the comment author. */
  commenterName?: string;

  /** Text content of the comment. */
  commentText?: string;

  /** Text content of the associated Facebook post. */
  postMessage?: string;

  /** ISO-formatted publication timestamp of the comment. */
  commentedOn?: string;

  /** Indicates whether the comment falls within the configured reply window. */
  canReply?: boolean;

  /** Error message describing an unsuccessful retrieval operation. */
  error?: string;
};

/**
 * Retrieves detailed inbox information for a specific Facebook comment.
 *
 * Resolves the stored comment, verifies its association with the supplied
 * post, and retrieves the connected account belonging to that post.
 *
 * Combines the retrieved records into a normalized inbox view and
 * calculates reply eligibility using the configured reply window.
 *
 * @param input - Identifiers required to retrieve the comment inbox view.
 * @param input.commentId - External identifier of the Facebook comment.
 * @param input.postId - Internal identifier of the associated post.
 *
 * @returns A promise resolving to the comment inbox view or a
 * structured failure result containing an error message.
 *
 * @remarks
 * Returns an unsuccessful result when the comment, associated post,
 * or connected account cannot be resolved.
 *
 * Missing display names and text values are replaced with fallback values.
 * Unexpected exceptions are recorded through the error-logging service.
 *
 * The canReply property reflects the local reply window calculation
 * and does not guarantee authorization to reply through Facebook.
 *
 * @throws May reject if the error-logging operation itself fails.
 *
 * @see isReplyWindowOpen
 * @see getFacebookInboxComment
 * @see getFacebookInboxAccount
 */
export async function getFacebookCommentInboxViewAction({
  commentId,
  postId,
}: {
  commentId: string;
  postId: string;
}): Promise<FacebookCommentInboxView> {
  try {
    // Resolve the comment and verify its association with the supplied post.
    const comment = await getFacebookInboxComment(commentId);
    if (!comment || comment.postId !== postId) {
      return { success: false, error: 'Comment not found.' };
    }

    // Retrieve the associated post and its connected account identifier.
    const posts = await getFacebookInboxPosts([comment.postId]);
    const post = posts[0] ?? null;
    if (!post?.accountId) {
      return { success: false, error: 'Post not found.' };
    }

    const account = await getFacebookInboxAccount(post.accountId);
    if (!account) {
      return { success: false, error: 'Account not found.' };
    }

    // Construct the normalized comment inbox view.
    return {
      success: true,
      accountId: account.id,
      pageId: account.platformId ?? undefined,
      pageName: account.name || 'Facebook Page',
      commenterId: comment.commenter?.id ?? undefined,
      commenterName: comment.commenter?.name ?? 'Facebook User',
      commentText: comment.commentText ?? '',
      postMessage: post.message ?? '',
      commentedOn: comment.commentedOn.toISOString(),
      canReply: isReplyWindowOpen(comment.commentedOn),
    };
  } catch (error) {
    const err = error as Error;
    await logError({
      process: 'getFacebookCommentInboxViewAction',
      location: 'actions/facebook/inbox.ts',
      errorMessage: err.message,
      context: { commentId, postId, stack: err.stack },
    });
    return { success: false, error: err.message };
  }
}

/**
 * Retrieves a unified feed of recent Facebook inbox messages and comments.
 *
 * Loads connected accounts and identifies Facebook accounts with
 * available platform identifiers.
 *
 * Retrieves recent stored comments, associated conversations, and
 * messages before transforming them into a common inbox item structure.
 *
 * Conversation entries represent the latest available message retrieved
 * for each conversation. Standalone comment entries are restricted
 * to the configured reply window.
 *
 * @returns A promise resolving to a maximum of 10 normalized inbox
 * items, ordered by creation time from newest to oldest.
 *
 * Returns an empty array when no qualifying Facebook accounts exist.
 *
 * @throws Propagates database retrieval, date conversion, and other
 * unexpected errors encountered while constructing the feed.
 *
 * @remarks
 * The operation applies the following retrieval limits:
 * - 200 connected accounts before Facebook-specific filtering.
 * - 500 recent Facebook comments.
 * - 400 conversations across the selected accounts.
 * - 1200 messages across the selected conversations.
 * - 10 items in the final combined inbox feed.
 *
 * Message selection depends on the ordering provided by the underlying
 * message retrieval service.
 *
 * Conversation-based items and standalone comments are combined without
 * deduplication. The reply window applies only to standalone comments.
 *
 * @see FacebookInboxItem
 * @see listFacebookInboxComments
 * @see listFacebookInboxConversations
 * @see listFacebookInboxMessages
 */
export async function listFacebookInboxFeedAction(): Promise<FacebookInboxItem[]> {
  // Retrieve connected accounts and retain qualifying Facebook accounts.
  const accounts = await listFacebookInboxAccounts(200);
  const facebookAccounts = accounts.filter(
    (account) => account.platform === 'Facebook' && account.platformId
  );

  if (!facebookAccounts.length) {
    return [];
  }

  // Index connected accounts for efficient conversation mapping.
  const accountById = new Map(facebookAccounts.map((account) => [account.id, account]));
  const accountIds = facebookAccounts.map((account) => account.id);

  // Retrieve comments published within the configured reply window.
  const replyWindowStart = new Date(Date.now() - REPLY_WINDOW_HOURS * 60 * 60 * 1000);
  const savedComments = await listFacebookInboxComments({ since: replyWindowStart, take: 500 });

  // Retrieve conversations and their most recent available messages.
  const conversations = await listFacebookInboxConversations(accountIds, 400);
  const latestMessages = await listFacebookInboxMessages(conversations.map((item) => item.id), 1200);

  // Retain the first retrieved message for each conversation.
  const latestByConversation = new Map<string, (typeof latestMessages)[number]>();
  for (const message of latestMessages) {
    if (!latestByConversation.has(message.conversationId)) {
      latestByConversation.set(message.conversationId, message);
    }
  }

  // Normalize conversation records into unified inbox items.
  const mappedMessages: FacebookInboxItem[] = conversations
    .map((conversation): FacebookInboxItem | null => {
      const account = accountById.get(conversation.channelId);
      if (!account) {
        return null;
      }

      const latest = latestByConversation.get(conversation.id);
      if (!latest) {
        return null;
      }

      return {
        id: `message_${conversation.id}`,
        type: latest.type === 'comment' ? 'comment' : 'message',
        accountId: account.id,
        pageId: String(account.platformId),
        pageName: account.name || 'Facebook Page',
        fromId: conversation.contactId,
        fromName: conversation.contactName || `Facebook User ${conversation.contactId.slice(-6)}`,
        text: latest.content,
        createdTime: latest.messageTime.toISOString(),
      };
    })
    .filter((item): item is FacebookInboxItem => item !== null);

  // Resolve unique posts and connected accounts associated with saved comments.
  const postIds = Array.from(new Set(savedComments.map((item) => item.postId)));
  const posts = postIds.length ? await getFacebookInboxPosts(postIds) : [];
  const postById = new Map(posts.map((post) => [post.id, post]));
  const accountIdsFromPosts = Array.from(new Set(posts.map((post) => post.accountId).filter(Boolean) as string[]));
  const accountsFromPosts = accountIdsFromPosts.length
    ? await getFacebookInboxAccounts(accountIdsFromPosts)
    : [];
  const accountByPostId = new Map(accountsFromPosts.map((account) => [account.id, account]));

  // Normalize eligible standalone comments and exclude unresolved associations.
  const mappedComments: FacebookInboxItem[] = savedComments
    .filter((comment) => isReplyWindowOpen(comment.commentedOn))
    .map((comment): FacebookInboxItem | null => {
      const post = postById.get(comment.postId);
      if (!post?.accountId) {
        return null;
      }

      const account = accountByPostId.get(post.accountId);
      if (!account?.platformId) {
        return null;
      }

      return {
        id: `comment_${comment.commentId}`,
        type: 'comment',
        accountId: account.id,
        pageId: String(account.platformId),
        pageName: account.name || 'Facebook Page',
        fromId: comment.commenter?.id ?? 'unknown',
        fromName: comment.commenter?.name || 'Facebook User',
        text: comment.commentText ?? '',
        createdTime: comment.commentedOn.toISOString(),
        commentId: comment.commentId,
        postId: comment.postId,
        postMessage: post.message ?? undefined,
      };
    })
    .filter((item): item is FacebookInboxItem => item !== null);

  // Combine both inbox sources, sort chronologically, and limit the feed.
  return [...mappedMessages, ...mappedComments]
    .sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime())
    .slice(0, 10);
}
