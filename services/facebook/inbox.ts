'use server';

import { dataStore } from '@/core/lib/data-store';
import { logError } from '@/core/lib/error-logging';

export type FacebookInboxItem = {
  id: string;
  type: 'message' | 'comment';
  accountId: string;
  pageId: string;
  pageName: string;
  fromId: string;
  fromName: string;
  fromProfilePic?: string;
  text: string;
  createdTime: string;
  commentId?: string;
  postId?: string;
  postMessage?: string;
  postPermalinkUrl?: string;
};

const REPLY_WINDOW_HOURS = 24;

const isReplyWindowOpen = (commentedOn: Date) => {
  const windowMs = REPLY_WINDOW_HOURS * 60 * 60 * 1000;
  return Date.now() - commentedOn.getTime() <= windowMs;
};

export type FacebookCommentInboxView = {
  success: boolean;
  accountId?: string;
  pageId?: string;
  pageName?: string;
  commenterId?: string;
  commenterName?: string;
  commentText?: string;
  postMessage?: string;
  commentedOn?: string;
  canReply?: boolean;
  error?: string;
};

export async function getFacebookCommentInboxViewAction({
  commentId,
  postId,
}: {
  commentId: string;
  postId: string;
}): Promise<FacebookCommentInboxView> {
  try {
    const comment = await dataStore.postComments.getByCommentId(commentId);
    if (!comment || comment.postId !== postId) {
      return { success: false, error: 'Comment not found.' };
    }

    const post = await dataStore.posts.getById(comment.postId);
    if (!post?.accountId) {
      return { success: false, error: 'Post not found.' };
    }

    const account = await dataStore.accounts.getById(post.accountId);
    if (!account) {
      return { success: false, error: 'Account not found.' };
    }

    return {
      success: true,
      accountId: account.id,
      pageId: account.platformId ?? undefined,
      pageName: account.name || 'Facebook Page',
      commenterId: comment.commenterId ?? undefined,
      commenterName: comment.commenterName ?? 'Facebook User',
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

export async function listFacebookInboxFeedAction(): Promise<FacebookInboxItem[]> {
  const accounts = await dataStore.accounts.list({ take: 200 });
  const facebookAccounts = accounts.filter(
    (account) => account.platform === 'Facebook' && account.platformId
  );

  if (!facebookAccounts.length) {
    return [];
  }

  const accountById = new Map(facebookAccounts.map((account) => [account.id, account]));
  const pageIds = facebookAccounts.map((account) => String(account.platformId));
  const accountIds = facebookAccounts.map((account) => account.id);

  const replyWindowStart = new Date(Date.now() - REPLY_WINDOW_HOURS * 60 * 60 * 1000);
  const savedComments = await dataStore.postComments.listRecent({
    platform: 'facebook',
    since: replyWindowStart,
    take: 500,
  });

  const conversations = await dataStore.conversations.listByChannelIds({
    channelIds: accountIds,
    take: 400,
  });
  const conversationById = new Map(conversations.map((conversation) => [conversation.id, conversation]));
  const latestMessages = await dataStore.messages.listByConversationIds({
    conversationIds: conversations.map((item) => item.id),
    take: 1200,
  });

  const latestByConversation = new Map<string, (typeof latestMessages)[number]>();
  for (const message of latestMessages) {
    if (!latestByConversation.has(message.conversationId)) {
      latestByConversation.set(message.conversationId, message);
    }
  }

  const mappedMessages: FacebookInboxItem[] = conversations
    .map((conversation) => {
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
        text: latest.text,
        createdTime: latest.timestamp.toISOString(),
      } as FacebookInboxItem;
    })
    .filter((item): item is FacebookInboxItem => item !== null);

  const postIds = Array.from(new Set(savedComments.map((item) => item.postId)));
  const posts = postIds.length ? await dataStore.posts.getByIds(postIds) : [];
  const postById = new Map(posts.map((post) => [post.id, post]));
  const accountIdsFromPosts = Array.from(new Set(posts.map((post) => post.accountId).filter(Boolean) as string[]));
  const accountsFromPosts = accountIdsFromPosts.length
    ? await dataStore.accounts.getByIds(accountIdsFromPosts)
    : [];
  const accountByPostId = new Map(accountsFromPosts.map((account) => [account.id, account]));

  const mappedComments: FacebookInboxItem[] = savedComments
    .filter((comment) => isReplyWindowOpen(comment.commentedOn))
    .map((comment) => {
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
        fromId: comment.commenterId ?? 'unknown',
        fromName: comment.commenterName || 'Facebook User',
        text: comment.commentText ?? '',
        createdTime: comment.commentedOn.toISOString(),
        commentId: comment.commentId,
        postId: comment.postId,
        postMessage: post.message ?? undefined,
      };
    })
    .filter((item): item is FacebookInboxItem => item !== null);

  return [...mappedMessages, ...mappedComments]
    .sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
}
