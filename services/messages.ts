'use server';

import { prisma } from '@neup/core/database/prisma';

/** Known message content types. */
export type MessageContentType =
  | 'reaction.like'
  | 'text'
  | 'voice_message'
  | 'link'
  | 'reels'
  | 'media_image'
  | 'media_video'
  | 'media_story';

/**
 * Lists messages in a conversation.
 *
 * Without `take`, returns all messages oldest first. With `take`, returns the
 * latest `take` messages, newest first.
 *
 * @param conversationId - Conversation ID.
 * @param take - Optional maximum number of (most recent) messages.
 * @returns The matching messages.
 */
export const listMessagesByConversationId = async (conversationId: string, take?: number) =>
  prisma.message.findMany({
    where: { conversationId },
    orderBy: take ? [{ messageTime: 'desc' }, { id: 'desc' }] : [{ messageTime: 'asc' }, { id: 'asc' }],
    ...(take ? { take } : {}),
  });

/**
 * Lists messages older than a given time, newest first. Useful for loading
 * earlier history when scrolling up.
 *
 * @param conversationId - Conversation ID.
 * @param before - Exclusive upper bound on `messageTime`.
 * @param take - Maximum rows to return (default `50`).
 * @returns Messages sent before `before`.
 */
export const listMessagesBefore = async (conversationId: string, before: Date, take = 50) => prisma.message.findMany({
  where: { conversationId, messageTime: { lt: before } },
  orderBy: [{ messageTime: 'desc' }, { id: 'desc' }],
  take,
});

/**
 * Lists messages newer than a given time, oldest first. Useful for polling
 * for new messages.
 *
 * @param conversationId - Conversation ID.
 * @param after - Exclusive lower bound on `messageTime`.
 * @param take - Maximum rows to return (default `50`).
 * @returns Messages sent after `after`.
 */
export const listMessagesAfter = async (conversationId: string, after: Date, take = 50) => prisma.message.findMany({
  where: { conversationId, messageTime: { gt: after } },
  orderBy: [{ messageTime: 'asc' }, { id: 'asc' }],
  take,
});

/**
 * Lists the most recent messages across several conversations, newest first.
 *
 * @param options - Query options.
 * @param options.conversationIds - Conversation IDs to include.
 * @param options.take - Maximum rows to return (default `1000`).
 * @returns The matching messages.
 */
export const listMessagesByConversationIds = async ({
  conversationIds,
  take = 1000,
}: {
  conversationIds: string[];
  take?: number;
}) =>
  prisma.message.findMany({
    where: { conversationId: { in: conversationIds } },
    orderBy: [{ messageTime: 'desc' }, { id: 'desc' }],
    take,
  });

/**
 * Finds a message by its platform-native message ID.
 *
 * @param platformMessageId - Message ID as issued by the platform.
 * @returns The message, or `null` if not found.
 */
export const findMessageByPlatformMessageId = async (platformMessageId: string) =>
  prisma.message.findUnique({ where: { platformMessageId } });

/**
 * Creates a message.
 *
 * If `platformMessageId` is omitted, a local ID (`local:<uuid>`) is generated.
 * If `platformInfo` is omitted but `callEvent` is set, `platformInfo` becomes
 * `{ callEvent }`.
 *
 * @param data - Message fields.
 * @param data.conversationId - Conversation the message belongs to.
 * @param data.platformMessageId - Platform-native message ID (optional).
 * @param data.platform - Platform name.
 * @param data.content - Message content.
 * @param data.senderId - Sender ID, or `null` for none.
 * @param data.direction - `'system'`, `'received'`, or `'sent'`.
 * @param data.messageTime - Message time (defaults to now).
 * @param data.platformInfo - Platform-specific metadata.
 * @param data.type - Content type (defaults to `'text'`).
 * @param data.callEvent - Call event name, stored in `platformInfo` when no `platformInfo` is given.
 * @returns The created message.
 */
export const createMessage = async (data: {
  conversationId: string;
  platformMessageId?: string | null;
  platform: string;
  content: string;
  senderId?: string | null;
  direction: 'system' | 'received' | 'sent';
  messageTime?: Date;
  platformInfo?: any;
  type?: MessageContentType | string;
  callEvent?: string | null;
}) =>
  prisma.message.create({
    data: {
      conversationId: data.conversationId,
      platform: data.platform,
      platformMessageId: data.platformMessageId ?? `local:${crypto.randomUUID()}`,
      content: data.content,
      senderId: data.senderId ?? null,
      direction: data.direction,
      messageTime: data.messageTime ?? new Date(),
      type: data.type ?? 'text',
      platformInfo: data.platformInfo ?? (data.callEvent ? { callEvent: data.callEvent } : undefined),
    },
  });
