'use server';

import { prisma } from '#/core/database/prisma';

export const listMessagesByConversationId = async (conversationId: string) =>
  prisma.message.findMany({
    where: { conversationId },
    orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
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
    orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
    take,
  });

export const findMessageByPlatformMessageId = async (platformMessageId: string) =>
  prisma.message.findUnique({ where: { platformMessageId } });

export const createMessage = async (data: {
  conversationId: string;
  platformMessageId?: string | null;
  platform: string;
  text: string;
  sender: string;
  timestamp?: Date;
  type?: string;
  callEvent?: string | null;
}) =>
  prisma.message.create({
    data: {
      conversationId: data.conversationId,
      platform: data.platform,
      platformMessageId: data.platformMessageId ?? `local:${crypto.randomUUID()}`,
      text: data.text,
      sender: data.sender,
      timestamp: data.timestamp ?? new Date(),
      type: data.type ?? 'text',
      moreDetails: data.callEvent ? { callEvent: data.callEvent } : undefined,
    },
  });
