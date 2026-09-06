'use server';

import { countConversations, getConversation, listConversations, type ConversationFilter } from '@/services/conversations';
import { listMessagesByConversationId } from '@/services/messages';
import { listAccounts } from '@/services/accounts';
import { decrypt } from '#/core/helpers/crypto';
import { getInstagramConversations } from '@/services/platform/instagram/conversations.list';
import { getInstagramConversationMessages, type InstagramConversationMessagesResponse } from '@/services/platform/instagram/conversation.messages.list';
import { findConversationByContactAndChannel, findConversationByPlatformId, createConversation, updateConversation } from '@/services/conversations';
import { upsertCachedMessage } from '@/services/message-cache';
import { getFacebookConversationMessages } from '@/services/platform/facebook/conversation.messages.list';

const toIso = (value?: Date | null) => (value ? value.toISOString() : null);
const serializeConversation = (conversation: Awaited<ReturnType<typeof getConversation>>) => conversation ? { ...conversation, lastMessageAt: toIso(conversation.lastMessageAt), createdAt: toIso(conversation.createdAt) } : null;
const serializeMessage = (message: Awaited<ReturnType<typeof listMessagesByConversationId>>[number]) => message ? { ...message, messageTime: toIso(message.messageTime) } : null;

async function restoreConversationMessages(conversation: NonNullable<Awaited<ReturnType<typeof getConversation>>>) {
  const platformInfo = (conversation.moreDetails as { platformInfo?: { conversationId?: string; pageId?: string } } | null)?.platformInfo;
  const platformConversationId = platformInfo?.conversationId;
  if (!platformConversationId) return;

  const account = (await listAccounts()).find((item) => item.id === conversation.channelId);
  if (!account?.encryptedToken) return;
  const accessToken = await decrypt(account.encryptedToken);
  const platform = conversation.platform.toLowerCase();

  if (platform === 'facebook') {
    const response = await getFacebookConversationMessages({ conversationId: platformConversationId, accessToken });
    await Promise.all((response.messages?.data ?? []).slice(0, 50).map((message) => upsertCachedMessage({
      conversationId: conversation.id,
      platform: 'Facebook',
      platformMessageId: `fb_msg:${account.id}:${message.id}`,
      text: message.message ?? '',
      sender: message.from?.id ?? 'unknown',
      direction: message.from?.id === (platformInfo.pageId ?? account.platformId) ? 'sent' : 'received',
      timestamp: message.created_time ? new Date(message.created_time) : new Date(),
      moreDetails: { from: message.from, to: message.to, attachments: message.attachments },
    })));
  } else if (platform === 'instagram') {
    const response = await getInstagramConversationMessages({ conversationId: platformConversationId, accessToken });
    await Promise.all((response.messages?.data ?? []).slice(0, 50).map((message) => upsertCachedMessage({
      conversationId: conversation.id,
      platform: 'Instagram',
      platformMessageId: message.id,
      text: message.message ?? '',
      sender: message.from?.id ?? 'unknown',
      direction: message.from?.id === account.platformId ? 'sent' : 'received',
      timestamp: message.created_time ? new Date(message.created_time) : new Date(),
      moreDetails: { from: message.from, to: message.to, attachments: message.attachments, replyTo: message.reply_to },
    })));
  } else {
    return;
  }

  const restored = await listMessagesByConversationId(conversation.id);
  const latest = restored[restored.length - 1];
  if (latest) {
    await updateConversation(conversation.id, {
      lastMessage: latest.content,
      lastMessageAt: latest.messageTime,
      moreDetails: {
        ...((conversation.moreDetails as Record<string, unknown> | null) ?? {}),
        fetchState: {
          messageSince: restored[0].messageTime.toISOString(),
          messageUpto: latest.messageTime.toISOString(),
        },
      },
    });
  }
}

export async function listConversationsAction({ skip = 0, take = 10, platform, filter }: { skip?: number; take?: number; platform?: string; filter?: ConversationFilter } = {}) {
  const conversations = await listConversations({ skip, take, platform, filter });
  const [total, unreadTotal] = await Promise.all([
    countConversations(platform, filter),
    countConversations(platform, 'unread'),
  ]);
  return {
    items: conversations.map((conversation) => serializeConversation(conversation)!),
    hasMore: conversations.length === take,
    total,
    unreadTotal,
  };
}
export async function getConversationAction(id: string) { return serializeConversation(await getConversation(id)); }
export async function updateConversationFetchMetadataAction(id: string, metadata: { messageSince?: string; messageUpto?: string; firstMessageOn?: string }) {
  const conversation = await getConversation(id);
  if (!conversation) return null;
  return serializeConversation(await updateConversation(id, {
    moreDetails: {
      ...((conversation.moreDetails as Record<string, unknown> | null) ?? {}),
      fetchState: {
        ...(((conversation.moreDetails as { fetchState?: Record<string, unknown> } | null)?.fetchState) ?? {}),
        ...metadata,
      },
    },
  }));
}
export async function listConversationMessagesAction(conversationId: string) {
  const conversation = await getConversation(conversationId);
  const fetchState = (conversation?.moreDetails as { fetchState?: { messageSince?: string; messageUpto?: string; firstMessageOn?: string } } | null)?.fetchState;
  const messages = await listMessagesByConversationId(conversationId, fetchState?.messageSince && fetchState?.messageUpto ? undefined : 30);
  if (messages.length === 0 && conversation) {
    await restoreConversationMessages(conversation);
    return (await listMessagesByConversationId(conversationId)).map((message) => serializeMessage(message)!);
  }
  const serialized = messages.map((message) => serializeMessage(message)!).sort((a, b) =>
    new Date(a.messageTime ?? 0).getTime() - new Date(b.messageTime ?? 0).getTime()
  );

  if (serialized.length > 0 && (!fetchState?.messageSince || !fetchState?.messageUpto)) {
    const first = serialized[0].messageTime;
    const last = serialized[serialized.length - 1].messageTime;
    await updateConversationFetchMetadataAction(conversationId, {
      messageSince: first ?? undefined,
      messageUpto: last ?? undefined,
    });
  }

  return serialized;
}

export async function listInstagramConversationsAction() {
  const accounts = await listAccounts({ owner: 'neupkishor' });
  const account = accounts.find((item) => item.platform.toLowerCase() === 'instagram');

  if (!account?.platformId || !account.encryptedToken) {
    console.log('[Instagram conversations] no connected Instagram account found');
    return null;
  }

  try {
    const accessToken = await decrypt(account.encryptedToken);
    const conversations = await getInstagramConversations({
      igUserId: account.platformId,
      accessToken,
      limit: 20,
    });
    console.log('[Instagram conversations] fetched from inbox', conversations);

    const recentConversations = conversations.data.slice(0, 20);
    await Promise.all(recentConversations.map(async (conversation) => {
      try {
        const detail = await getInstagramConversationMessages({
          conversationId: conversation.id,
          accessToken,
        });
        const latestMessage = detail.messages?.data?.[0];
        await Promise.all((detail.messages?.data ?? []).map((message) => upsertCachedMessage({
          conversationId: conversation.id,
          platform: 'Instagram',
          platformMessageId: message.id,
          text: message.message ?? '',
          sender: message.from?.id ?? 'unknown',
          timestamp: message.created_time ? new Date(message.created_time) : new Date(),
          moreDetails: { from: message.from, to: message.to, attachments: message.attachments, replyTo: message.reply_to },
        })));
        const contact = latestMessage
          ? latestMessage.from?.id === account.platformId
            ? latestMessage.to?.data?.[0]
            : latestMessage.from
          : undefined;
        const existing = await findConversationByPlatformId(conversation.id)
          ?? await findConversationByContactAndChannel(conversation.id, account.platformId!);
        const values = {
          contactName: contact?.username || contact?.id || 'Instagram user',
          lastMessage: latestMessage?.message ?? null,
          lastMessageAt: latestMessage?.created_time ? new Date(latestMessage.created_time) : new Date(conversation.updated_time),
          unread: false,
          avatar: (contact?.username || contact?.id || 'IG').slice(0, 2).toUpperCase(),
        };

        if (existing) {
          await updateConversation(existing.id, {
            ...values,
            moreDetails: { platformInfo: { conversationId: conversation.id, recipientId: contact?.id } },
          });
        } else {
          await createConversation({
            contactId: conversation.id,
            channelId: account.platformId!,
            platform: 'Instagram',
            moreDetails: { platformInfo: { conversationId: conversation.id, recipientId: contact?.id } },
            ...values,
          });
        }
        console.log('[Instagram conversations] synced conversation', { conversationId: conversation.id, latestMessage });
      } catch (error) {
        console.error('[Instagram conversations] failed to sync conversation', {
          conversationId: conversation.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }));

    return conversations;
  } catch (error) {
    console.error('[Instagram conversations] inbox fetch failed', error);
    return null;
  }
}

export async function listInstagramConversationMessagesAction(conversationId: string, after?: string): Promise<InstagramConversationMessagesResponse | null> {
  const accounts = await listAccounts({ owner: 'neupkishor' });
  const account = accounts.find((item) => item.platform.toLowerCase() === 'instagram');

  if (!account?.encryptedToken) {
    console.log('[Instagram conversation messages] no connected Instagram account found');
    return null;
  }

  const accessToken = await decrypt(account.encryptedToken);
  const localConversation = await getConversation(conversationId);
  const instagramConversationId = (localConversation?.moreDetails as { platformInfo?: { conversationId?: string } } | null)
    ?.platformInfo?.conversationId;

  if (!instagramConversationId) {
    throw new Error('Instagram conversation ID is missing from the local conversation record.');
  }

  const response = await getInstagramConversationMessages({ conversationId: instagramConversationId, accessToken, after });
  await Promise.all((response.messages?.data ?? []).map((message) => upsertCachedMessage({
    conversationId,
    platform: 'Instagram',
    platformMessageId: message.id,
    text: message.message ?? '',
    sender: message.from?.id ?? 'unknown',
    timestamp: message.created_time ? new Date(message.created_time) : new Date(),
    moreDetails: { from: message.from, to: message.to, attachments: message.attachments, replyTo: message.reply_to },
  })));
  return response;
}
