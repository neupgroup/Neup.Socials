'use server';

import { prisma } from '@/core/database/prisma';

export const listMessagesByConversationId = async (conversationId: string) =>
  prisma.conversationMessage.findMany({
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
  prisma.conversationMessage.findMany({
    where: { conversationId: { in: conversationIds } },
    orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
    take,
  });

export const findMessageByPlatformMessageId = async (platformMessageId: string) =>
  prisma.conversationMessage.findUnique({ where: { platformMessageId } });

export const createMessage = async (data: {
  conversationId: string;
  platformMessageId?: string | null;
  text: string;
  sender: string;
  timestamp?: Date;
  type?: string;
  callEvent?: string | null;
}) =>
  prisma.conversationMessage.create({
    data: {
      conversationId: data.conversationId,
      platformMessageId: data.platformMessageId,
      text: data.text,
      sender: data.sender,
      timestamp: data.timestamp ?? new Date(),
      type: data.type ?? 'text',
      callEvent: data.callEvent,
    },
  });
