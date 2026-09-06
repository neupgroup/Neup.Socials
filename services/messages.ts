'use server';

import { prisma } from '#/core/database/prisma';

export const listMessagesByConversationId = async (conversationId: string) =>
  prisma.message.findMany({
    where: { conversationId },
    orderBy: [{ messageTime: 'asc' }, { id: 'asc' }],
  });

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

export const findMessageByPlatformMessageId = async (platformMessageId: string) =>
  prisma.message.findUnique({ where: { platformMessageId } });

export const createMessage = async (data: {
  conversationId: string;
  platformMessageId?: string | null;
  platform: string;
  content: string;
  senderId?: string | null;
  direction: 'system' | 'received' | 'sent';
  messageTime?: Date;
  platformInfo?: any;
  type?: string;
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
