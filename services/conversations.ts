'use server';

import { prisma } from '#/core/database/prisma';

export type ConversationFilter = 'unread' | 'sent' | 'starred' | 'archived' | 'trash';

export const listConversations = async ({ skip = 0, take = 10, platform, filter }: { skip?: number; take?: number; platform?: string; filter?: ConversationFilter } = {}) =>
  prisma.conversation.findMany({
    where: {
      ...(platform ? { platform: { equals: platform, mode: 'insensitive' as const } } : {}),
      ...(filter === 'unread' ? { unread: true } : {}),
      ...(filter && filter !== 'unread' ? { moreDetails: { path: ['inboxFilter'], equals: filter } } : {}),
    },
    orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
    skip,
    take,
  });

export const countConversations = async (platform?: string, filter?: ConversationFilter) =>
  prisma.conversation.count({
    where: {
      ...(platform ? { platform: { equals: platform, mode: 'insensitive' as const } } : {}),
      ...(filter === 'unread' ? { unread: true } : {}),
      ...(filter && filter !== 'unread' ? { moreDetails: { path: ['inboxFilter'], equals: filter } } : {}),
    },
  });

export const getConversation = async (id: string) =>
  prisma.conversation.findUnique({ where: { id } });

export const findConversationByContactAndChannel = async (contactId: string, channelId: string) =>
  prisma.conversation.findFirst({ where: { contactId, channelId } });

export const findConversationByPlatformId = async (platformConversationId: string) =>
  prisma.conversation.findFirst({ where: { moreDetails: { path: ['platformInfo', 'conversationId'], equals: platformConversationId } } });

export const listConversationsByChannelIds = async ({
  channelIds,
  take = 200,
}: {
  channelIds: string[];
  take?: number;
}) =>
  prisma.conversation.findMany({
    where: { channelId: { in: channelIds } },
    orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
    take,
  });

export const createConversation = async (data: {
  moreDetails?: any;
  contactId: string;
  contactName: string;
  channelId: string;
  platform: string;
  lastMessage?: string | null;
  lastMessageAt?: Date | null;
  unread?: boolean;
  avatar?: string | null;
}) =>
  prisma.conversation.create({
    data: {
      moreDetails: data.moreDetails,
      contactId: data.contactId,
      contactName: data.contactName,
      channelId: data.channelId,
      platform: data.platform,
      lastMessage: data.lastMessage,
      lastMessageAt: data.lastMessageAt ?? new Date(),
      unread: data.unread ?? false,
      avatar: data.avatar,
    },
  });

export const updateConversation = async (id: string, data: {
  moreDetails?: any;
  contactName?: string;
  lastMessage?: string | null;
  lastMessageAt?: Date | null;
  unread?: boolean;
  avatar?: string | null;
}) => prisma.conversation.update({ where: { id }, data });
