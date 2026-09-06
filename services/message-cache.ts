'use server';

import { prisma } from '#/core/database/prisma';

export const listCachedMessages = async (conversationId: string) => prisma.message.findMany({
  where: { conversationId },
  orderBy: [{ messageTime: 'asc' }, { id: 'asc' }],
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
