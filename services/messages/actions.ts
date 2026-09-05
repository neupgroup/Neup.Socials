'use server';

import { findConversationByContactAndChannel, getConversation, createConversation, updateConversation } from '@/services/conversations';
import { createMessage, findMessageByPlatformMessageId } from '@/services/messages';
import { upsertCachedMessage } from '@/services/message-cache';

const toIso = (value?: Date | null) => (value ? value.toISOString() : null);
const serializeConversation = (conversation: Awaited<ReturnType<typeof getConversation>>) => conversation ? { ...conversation, lastMessageAt: toIso(conversation.lastMessageAt), createdAt: toIso(conversation.createdAt) } : null;
const serializeMessage = (message: Awaited<ReturnType<typeof findMessageByPlatformMessageId>>) => message ? { ...message, timestamp: toIso(message.timestamp) } : null;

export async function recordOutgoingMessageAction({ conversationId, channelId, contactId, contactName, platform, text, avatar, platformMessageId }: { conversationId?: string; channelId: string; contactId: string; contactName: string; platform: string; text: string; avatar?: string | null; platformMessageId?: string }) {
  let conversation = conversationId ? await getConversation(conversationId) : null;
  if (!conversation) {
    conversation = (await findConversationByContactAndChannel(contactId, channelId)) ?? (await findConversationByContactAndChannel(contactId.startsWith('+') ? contactId.slice(1) : `+${contactId}`, channelId));
  }
  if (!conversation) {
    conversation = await createConversation({ contactId, contactName, channelId, platform, lastMessage: text, lastMessageAt: new Date(), unread: false, avatar: avatar ?? contactId.slice(-2) });
  } else {
    conversation = await updateConversation(conversation.id, { contactName, lastMessage: text, lastMessageAt: new Date(), unread: false, avatar: avatar ?? conversation.avatar });
  }
  const message = await createMessage({ conversationId: conversation.id, text, sender: 'agent', timestamp: new Date() });
  if (platformMessageId) {
    await upsertCachedMessage({ conversationId: conversation.id, platform, platformMessageId, text, sender: channelId, timestamp: new Date() });
  }
  return { conversation: serializeConversation(conversation), message: serializeMessage(message) };
}
