'use server';

import { findConversationByContactAndChannel, getConversation, createConversation, updateConversation } from '@/services/conversations';
import { createMessage, findMessageByPlatformMessageId } from '@/services/messages';
import { upsertCachedMessage } from '@/services/message-cache';

/**
 * Converts an optional Date into an ISO 8601 string for safe serialization.
 * @param value - The date to convert; may be `null` or `undefined`.
 * @returns The ISO 8601 string, or `null` when no date is provided.
 */
const toIso = (value?: Date | null) => (value ? value.toISOString() : null);

/**
 * Makes a conversation serializable by converting `lastMessageAt` and
 * `createdAt` to ISO strings.
 * @param conversation - The conversation returned by `getConversation`, or `null`.
 * @returns The serialized conversation, or `null` if none was given.
 */
const serializeConversation = (conversation: Awaited<ReturnType<typeof getConversation>>) => conversation ? { ...conversation, lastMessageAt: toIso(conversation.lastMessageAt), createdAt: toIso(conversation.createdAt) } : null;

/**
 * Makes a message serializable by converting `messageTime` to an ISO string.
 * @param message - The message returned by the messages service, or `null`.
 * @returns The serialized message, or `null` if none was given.
 */
const serializeMessage = (message: Awaited<ReturnType<typeof findMessageByPlatformMessageId>>) => message ? { ...message, messageTime: toIso(message.messageTime) } : null;

/**
 * Server action that records a message sent by the business/channel to a contact.
 *
 * Flow:
 * 1. Resolves the conversation: by `conversationId` if given, otherwise by
 *    contact + channel. The contact lookup is retried with the leading `+`
 *    toggled, so `+977...` and `977...` match the same conversation.
 * 2. Creates the conversation if none exists, otherwise updates its contact
 *    name, last message, timestamp and avatar, and marks it as read
 *    (`unread: false`).
 * 3. Stores the message with direction `'sent'`.
 * 4. If `platformMessageId` is provided, also upserts the message into the
 *    message cache.
 *
 * When creating a conversation without an `avatar`, the last two characters of
 * `contactId` are used as a fallback.
 *
 * @param params - The outgoing message details.
 * @param params.conversationId - Optional id of an existing conversation.
 * @param params.channelId - Id of the sending channel (stored as the message sender).
 * @param params.contactId - Id of the recipient contact (e.g. phone number or PSID).
 * @param params.contactName - Display name of the contact.
 * @param params.platform - Platform the message was sent on (e.g. `'facebook'`).
 * @param params.text - The message text.
 * @param params.avatar - Optional avatar for the conversation.
 * @param params.platformMessageId - Optional id assigned by the platform; enables caching.
 * @returns A promise resolving to `{ conversation, message }`, both serialized
 *   with dates as ISO strings.
 */
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
  const message = await createMessage({ conversationId: conversation.id, platform, content: text, senderId: channelId, direction: 'sent', messageTime: new Date(), platformMessageId, platformInfo: { sender: channelId, receiver: contactId } });
  if (platformMessageId) {
    await upsertCachedMessage({ conversationId: conversation.id, platform, platformMessageId, text, sender: channelId, timestamp: new Date(), direction: 'sent' });
  }
  return { conversation: serializeConversation(conversation), message: serializeMessage(message) };
}
