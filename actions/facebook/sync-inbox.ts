'use server';

import { decrypt } from '@/lib/crypto';
import { dataStore } from '@/lib/data-store';
import { logError } from '@/lib/error-logging';
import { getPageConversationsWithMessages } from '@/core/facebook/messages';
import { getPagePostComments } from '@/core/facebook/comments';

type SyncResult = {
  success: boolean;
  synced: number;
  error?: string;
};

async function upsertConversationMessage(params: {
  accountId: string;
  contactId: string;
  contactName: string;
  text: string;
  platformMessageId: string;
  timestamp: Date;
  type?: string;
}): Promise<boolean> {
  const {
    accountId,
    contactId,
    contactName,
    text,
    platformMessageId,
    timestamp,
    type = 'text',
  } = params;

  if (!text.trim()) {
    return false;
  }

  const existing = await dataStore.messages.findByPlatformMessageId(platformMessageId);
  if (existing) {
    return false;
  }

  const avatar = contactName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  let conversation = await dataStore.conversations.findByContactAndChannel(contactId, accountId);

  if (!conversation) {
    conversation = await dataStore.conversations.create({
      contactId,
      contactName,
      channelId: accountId,
      platform: 'Facebook',
      lastMessage: text,
      lastMessageAt: timestamp,
      unread: true,
      avatar,
    });
  } else {
    conversation = await dataStore.conversations.update(conversation.id, {
      contactName,
      lastMessage: text,
      lastMessageAt: timestamp,
      unread: true,
      avatar: conversation.avatar || avatar,
    });
  }

  await dataStore.messages.create({
    conversationId: conversation.id,
    platformMessageId,
    text,
    sender: 'user',
    timestamp,
    type,
  });

  return true;
}

export async function syncFacebookMessagesAction(accountId: string): Promise<SyncResult> {
  try {
    const account = await dataStore.accounts.getById(accountId);
    if (!account) {
      throw new Error('Account not found.');
    }

    if (account.platform !== 'Facebook') {
      return { success: true, synced: 0 };
    }

    if (!account.encryptedToken || !account.platformId) {
      throw new Error('Facebook account is missing required credentials.');
    }

    const pageId = account.platformId;
    const pageToken = await decrypt(account.encryptedToken);
    const messages = await getPageConversationsWithMessages(pageId, pageToken);

    let saved = 0;
    for (const item of messages) {
      const inserted = await upsertConversationMessage({
        accountId,
        contactId: item.senderId,
        contactName: item.senderName,
        text: item.text,
        platformMessageId: `fb_msg:${accountId}:${item.messageId}`,
        timestamp: new Date(item.createdTime),
        type: 'text',
      });

      if (inserted) {
        saved += 1;
      }
    }

    await dataStore.syncLogEntries.create({
      type: 'messages',
      platform: 'facebook',
      forProfile: accountId,
      moreInfo: {
        status: 'Success',
        fetched: messages.length,
        saved,
        source: 'syncFacebookMessagesAction',
      },
    });

    return { success: true, synced: saved };
  } catch (error: any) {
    await dataStore.syncLogEntries.create({
      type: 'info',
      platform: 'facebook',
      forProfile: accountId,
      moreInfo: {
        status: 'Failed',
        operation: 'messages',
        errorMessage: error?.message || 'Failed to sync Facebook messages.',
        source: 'syncFacebookMessagesAction',
      },
    });

    await logError({
      process: 'syncFacebookMessagesAction',
      location: 'actions/facebook/sync-inbox.ts',
      errorMessage: error?.message || 'Failed to sync Facebook messages.',
      context: { accountId },
    });

    return {
      success: false,
      synced: 0,
      error: error?.message || 'Failed to sync Facebook messages.',
    };
  }
}

export async function syncFacebookCommentsAction(accountId: string): Promise<SyncResult> {
  try {
    const account = await dataStore.accounts.getById(accountId);
    if (!account) {
      throw new Error('Account not found.');
    }

    if (account.platform !== 'Facebook') {
      return { success: true, synced: 0 };
    }

    if (!account.encryptedToken || !account.platformId) {
      throw new Error('Facebook account is missing required credentials.');
    }

    const pageId = account.platformId;
    const pageToken = await decrypt(account.encryptedToken);
    const comments = await getPagePostComments(pageId, pageToken);

    let saved = 0;

    for (const item of comments) {
      const commentor = await dataStore.commentors.upsertByPlatformProfileAndUser({
        platform: 'Facebook',
        onProfile: pageId,
        platformUserId: item.commenterId,
        name: item.commenterName,
        firstInteraction: new Date(item.createdTime),
      });

      const platformCommentId = `facebook:${pageId}:${item.commentId}`;
      const existingComment = await dataStore.comments.findByPlatformCommentId(platformCommentId);
      if (!existingComment) {
        await dataStore.comments.create({
          by: commentor.id,
          onProfile: pageId,
          comment: item.commentText,
          on: new Date(item.createdTime),
          platform: 'Facebook',
          platformCommentId,
          postId: item.postId,
          postMessage: item.postMessage,
          permalinkUrl: item.permalinkUrl,
        });
        saved += 1;
      }

      await upsertConversationMessage({
        accountId,
        contactId: item.commenterId,
        contactName: item.commenterName,
        text: item.postId ? `Comment on ${item.postId}: ${item.commentText}` : `Comment: ${item.commentText}`,
        platformMessageId: `fb_comment:${accountId}:${item.commentId}`,
        timestamp: new Date(item.createdTime),
        type: 'comment',
      });
    }

    await dataStore.syncLogEntries.create({
      type: 'comments',
      platform: 'facebook',
      forProfile: accountId,
      moreInfo: {
        status: 'Success',
        fetched: comments.length,
        saved,
        source: 'syncFacebookCommentsAction',
      },
    });

    return { success: true, synced: saved };
  } catch (error: any) {
    await dataStore.syncLogEntries.create({
      type: 'info',
      platform: 'facebook',
      forProfile: accountId,
      moreInfo: {
        status: 'Failed',
        operation: 'comments',
        errorMessage: error?.message || 'Failed to sync Facebook comments.',
        source: 'syncFacebookCommentsAction',
      },
    });

    await logError({
      process: 'syncFacebookCommentsAction',
      location: 'actions/facebook/sync-inbox.ts',
      errorMessage: error?.message || 'Failed to sync Facebook comments.',
      context: { accountId },
    });

    return {
      success: false,
      synced: 0,
      error: error?.message || 'Failed to sync Facebook comments.',
    };
  }
}
