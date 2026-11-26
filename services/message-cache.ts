'use server';

import { prisma } from '@neup/core/database/prisma';

/**
 * Lists all cached messages for a conversation, oldest first.
 *
 * @param conversationId - Conversation ID.
 * @returns Messages ordered by `messageTime` then `id`, ascending.
 */
export const listCachedMessages = async (conversationId: string) => prisma.message.findMany({
  where: { conversationId },
  orderBy: [{ messageTime: 'asc' }, { id: 'asc' }],
});

/**
 * Creates or updates a message keyed by `platformMessageId`.
 *
 * `data.text` is stored as `content`, `data.timestamp` as `messageTime`, and
 * `data.sender` is merged into `platformInfo` alongside any `moreDetails`.
 *
 * @param data - Message fields.
 * @param data.conversationId - Conversation the message belongs to.
 * @param data.platform - Platform name.
 * @param data.platformMessageId - Platform-native message ID (unique key).
 * @param data.text - Message text.
 * @param data.sender - Sender identifier from the platform.
 * @param data.timestamp - Time the message was sent or received.
 * @param data.type - Content type (defaults to `'text'`).
 * @param data.moreDetails - Extra metadata merged into `platformInfo`.
 * @param data.direction - Message direction (defaults to `'received'`).
 * @returns The created or updated message.
 */
export const upsertCachedMessage = async (data: {
  conversationId: string;
  platform: string;
  platformMessageId: string;
  text: string;
  sender: string;
  timestamp: Date;
  type?: string;
  moreDetails?: any;
  direction?: 'system' | 'received' | 'sent';
}) => prisma.message.upsert({
  where: { platformMessageId: data.platformMessageId },
  create: {
    conversationId: data.conversationId,
    platform: data.platform,
    platformMessageId: data.platformMessageId,
    content: data.text,
    senderId: null,
    messageTime: data.timestamp,
    type: data.type ?? 'text',
    platformInfo: { ...(data.moreDetails ?? {}), sender: data.sender },
    direction: data.direction ?? 'received',
  },
  update: {
    content: data.text,
    senderId: null,
    direction: data.direction ?? 'received',
    messageTime: data.timestamp,
    type: data.type ?? 'text',
    platformInfo: { ...(data.moreDetails ?? {}), sender: data.sender },
  },
});
