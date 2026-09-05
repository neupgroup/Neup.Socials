'use server';

import { prisma } from '#/core/database/prisma';

export const listCachedMessages = async (conversationId: string) => prisma.message.findMany({
  where: { conversationId },
  orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
});

export const upsertCachedMessage = async (data: {
  conversationId: string;
  platform: string;
  platformMessageId: string;
  text: string;
  sender: string;
  timestamp: Date;
  type?: string;
  moreDetails?: any;
}) => prisma.message.upsert({
  where: { platformMessageId: data.platformMessageId },
  create: data,
  update: data,
});
