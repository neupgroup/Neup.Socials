/**
 * @fileoverview Synchronizes Facebook messages and comments into local
 * repositories, conversation records, identities, and synchronization logs.
 * @module services/facebook/sync-inbox
 */
'use server';

import { decrypt } from '@neup/core/helpers/crypto';
import { dataStore } from '@/services/repositories';
import { logError } from '@/services/error-logging';
import { getFacebookConversations } from '@/services/platform/facebook/conversations.list';
import { getFacebookConversationMessages } from '@/services/platform/facebook/conversation.messages.list';
import { getPagePostComments } from '@/services/facebook/comments-api';
import { getPageScopedProfile } from '@/services/facebook/comments-api';

/** Result of a synchronization operation. */
type SyncResult = {
  /** Whether synchronization completed without a caught exception. */
  success: boolean;
  /** Number of newly inserted primary records reported by the action. */
  synced: number;
  /** Failure description, when available. */
  error?: string;
};

/**
 * Inserts a new message and creates or updates its contact conversation.
 * Skips blank text and existing platform message identifiers.
 * @param params - Message and conversation information.
 * @param params.accountId - Internal connected account identifier.
 * @param params.contactId - External contact identifier.
 * @param params.contactName - Contact display name.
 * @param params.platformConversationId - External or synthetic conversation identifier.
 * @param params.pageId - External Facebook Page identifier.
 * @param params.text - Message content.
 * @param params.platformMessageId - Deduplication identifier for the message.
 * @param params.timestamp - Message timestamp.
 * @param params.type - Message classification; defaults to text.
 * @param params.sender - Sender classification; defaults to user.
 * @returns True when a message is inserted; false when skipped.
 * @throws Propagates repository errors; writes are not explicitly transactional.
 * @remarks Conversation metadata is updated before message insertion.
 */
async function upsertConversationMessage(params: {
  accountId: string;
  contactId: string;
  contactName: string;
  platformConversationId: string;
  pageId: string;
  text: string;
  platformMessageId: string;
  timestamp: Date;
  type?: string;
  sender?: 'user' | 'page';
}): Promise<boolean> {
  const {
    accountId,
    contactId,
    contactName,
    platformConversationId,
    pageId,
    text,
    platformMessageId,
    timestamp,
    type = 'text',
    sender = 'user',
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
      moreDetails: { platformInfo: { conversationId: platformConversationId, pageId } },
    });
  } else {
    conversation = await dataStore.conversations.update(conversation.id, {
      contactName,
      lastMessage: text,
      lastMessageAt: timestamp,
      unread: true,
      avatar: conversation.avatar || avatar,
      moreDetails: { platformInfo: { conversationId: platformConversationId, pageId } },
    });
  }

  await dataStore.messages.create({
    conversationId: conversation.id,
    platform: 'Facebook',
    platformMessageId,
    content: text,
    senderId: null,
    direction: sender === 'page' ? 'sent' : 'received',
    platformInfo: { sender: params.contactId, receiver: pageId },
    messageTime: timestamp,
    type,
  });

  return true;
}

/**
 * Retrieves Facebook conversations and their text messages and stores new messages.
 * Resolves credentials, classifies senders, and records synchronization outcomes.
 * @param accountId - Internal connected account identifier.
 * @returns Synchronization status and number of newly inserted messages.
 * Non-Facebook accounts return success with zero inserts.
 * @remarks Messages missing identifiers, text, or sender IDs are skipped.
 * The sender ID is passed as the contact ID for both incoming and outgoing messages.
 * Pagination depends on the delegated retrieval services.
 * A failure may report zero even after partial writes have completed.
 * @throws May reject if synchronization logging or error logging fails in the catch block.
 */
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
    const conversations = await getFacebookConversations({ pageId, accessToken: pageToken });
    const messages = [] as Array<{
      conversationId: string;
      messageId: string;
      text: string;
      createdTime: string;
      senderId: string;
      senderName: string;
      sender: 'user' | 'page';
    }>;

    for (const conversation of conversations.data) {
      const conversationMessages = await getFacebookConversationMessages({
        conversationId: conversation.id,
        accessToken: pageToken,
      });
      for (const message of conversationMessages.messages?.data ?? []) {
        if (!message.id || !message.message?.trim() || !message.from?.id) continue;
        messages.push({
          conversationId: conversation.id,
          messageId: message.id,
          text: message.message,
          createdTime: message.created_time ?? conversation.updated_time ?? new Date().toISOString(),
          senderId: message.from.id,
          senderName: message.from.name || (message.from.id === pageId ? account.name : `Facebook User ${message.from.id.slice(-6)}`),
          sender: message.from.id === pageId ? 'page' : 'user',
        });
      }
    }

    let saved = 0;
    for (const item of messages) {
      const inserted = await upsertConversationMessage({
        accountId,
        contactId: item.senderId,
        contactName: item.senderName,
        platformConversationId: item.conversationId,
        pageId,
        text: item.text,
        platformMessageId: `fb_msg:${accountId}:${item.messageId}`,
        timestamp: new Date(item.createdTime),
        type: 'text',
        sender: item.sender,
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

/**
 * Synchronizes recent Facebook Page comments into commenter, identity,
 * comment, Facebook-specific comment, and conversation message repositories.
 * Attempts to enrich commenter names and pictures with page-scoped profiles.
 * @param accountId - Internal connected account identifier.
 * @returns Synchronization status and count of newly created general comment records.
 * Non-Facebook accounts return success with zero inserts.
 * @remarks Profile lookup failures fall back to the comment payload name.
 * General comments, Facebook-specific comments, and conversation messages use
 * separate duplicate checks. Writes are not explicitly transactional.
 * The reported count excludes other repository insertions and updates.
 * A failure may report zero despite partial persistence.
 * @throws May reject if synchronization logging or error logging fails in the catch block.
 */
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
      let resolvedName = item.commenterName;
      let profilePic = '';

      try {
        const profile = await getPageScopedProfile(item.commenterId, pageToken);
        const fullName = `${String(profile.first_name ?? '').trim()} ${String(profile.last_name ?? '').trim()}`.trim();
        resolvedName = fullName || resolvedName;
        profilePic = String(profile.profile_pic ?? '').trim();
      } catch {
        // Fallback to comment payload name if profile endpoint is unavailable.
      }

      const commentor = await dataStore.commentors.upsertByPlatformProfileAndUser({
        platform: 'Facebook',
        onProfile: pageId,
        platformUserId: item.commenterId,
        name: resolvedName,
        firstInteraction: new Date(item.createdTime),
      });

      await dataStore.identityPlatform.upsertWithUnified({
        platform: 'facebook',
        platUserId: item.commenterId,
        name: resolvedName,
        moreInfo: {
          profilePic: profilePic || null,
          pageId,
          source: 'syncFacebookCommentsAction',
        },
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

      const commentedOn = new Date(item.createdTime);
      const existingFacebookComment = await dataStore.facebookComments.findExisting({
        psid: item.commenterId,
        comment: item.commentText,
        commentedOn,
      });

      if (!existingFacebookComment) {
        await dataStore.facebookComments.create({
          psid: item.commenterId,
          comment: item.commentText,
          commentedOn,
          moreInfo: {
            pageId,
            commentId: item.commentId,
            postId: item.postId,
            postMessage: item.postMessage,
            permalinkUrl: item.permalinkUrl,
            commenterName: resolvedName,
            commenterProfilePic: profilePic || null,
            source: 'syncFacebookCommentsAction',
          },
        });
      }

      await upsertConversationMessage({
        accountId,
        contactId: item.commenterId,
        contactName: resolvedName,
        platformConversationId: `comment:${item.commentId}`,
        pageId,
        text: item.postId ? `Comment on ${item.postId}: ${item.commentText}` : `Comment: ${item.commentText}`,
        platformMessageId: `fb_comment:${accountId}:${item.commentId}`,
        timestamp: commentedOn,
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
