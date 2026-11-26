'use server';

import { prisma } from '@neup/core/database/prisma';

/**
 * Inbox filter for conversations.
 * `unread` uses the `unread` column; every other value is matched against
 * `moreDetails.inboxFilter` (JSON).
 */
export type ConversationFilter = 'unread' | 'sent' | 'starred' | 'archived' | 'trash';

/**
 * Lists conversations, newest message first.
 *
 * @param options - Query options.
 * @param options.skip - Number of rows to skip (default `0`).
 * @param options.take - Maximum rows to return (default `10`).
 * @param options.platform - Case-insensitive platform name to filter by.
 * @param options.filter - Inbox filter to apply.
 * @returns The matching conversations ordered by `lastMessageAt` then `id`, descending.
 */
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

/**
 * Counts conversations matching the same filters as {@link listConversations}.
 *
 * @param platform - Case-insensitive platform name to filter by.
 * @param filter - Inbox filter to apply.
 * @returns The number of matching conversations.
 */
export const countConversations = async (platform?: string, filter?: ConversationFilter) =>
  prisma.conversation.count({
    where: {
      ...(platform ? { platform: { equals: platform, mode: 'insensitive' as const } } : {}),
      ...(filter === 'unread' ? { unread: true } : {}),
      ...(filter && filter !== 'unread' ? { moreDetails: { path: ['inboxFilter'], equals: filter } } : {}),
    },
  });

/**
 * Gets a conversation by its internal ID.
 *
 * @param id - Conversation ID.
 * @returns The conversation, or `null` if not found.
 */
export const getConversation = async (id: string) =>
  prisma.conversation.findUnique({ where: { id } });

/**
 * Finds the conversation between a contact and a channel.
 *
 * @param contactId - Contact ID.
 * @param channelId - Channel ID.
 * @returns The first matching conversation, or `null` if none exists.
 */
export const findConversationByContactAndChannel = async (contactId: string, channelId: string) =>
  prisma.conversation.findFirst({ where: { contactId, channelId } });

/**
 * Finds a conversation by the platform's own conversation ID, stored at
 * `moreDetails.platformInfo.conversationId`.
 *
 * @param platformConversationId - Conversation ID as issued by the platform.
 * @returns The first matching conversation, or `null` if none exists.
 */
export const findConversationByPlatformId = async (platformConversationId: string) =>
  prisma.conversation.findFirst({ where: { moreDetails: { path: ['platformInfo', 'conversationId'], equals: platformConversationId } } });

/**
 * Lists conversations belonging to any of the given channels, newest first.
 *
 * @param options - Query options.
 * @param options.channelIds - Channel IDs to include.
 * @param options.take - Maximum rows to return (default `200`).
 * @returns The matching conversations.
 */
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

/**
 * Creates a conversation.
 *
 * @param data - Conversation fields.
 * @param data.moreDetails - Arbitrary JSON metadata.
 * @param data.contactId - ID of the contact.
 * @param data.contactName - Display name of the contact.
 * @param data.channelId - ID of the channel.
 * @param data.platform - Platform name.
 * @param data.lastMessage - Preview of the last message.
 * @param data.lastMessageAt - Time of the last message (defaults to now).
 * @param data.unread - Whether the conversation is unread (defaults to `false`).
 * @param data.avatar - Avatar URL.
 * @returns The created conversation.
 */
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

/**
 * Updates a conversation. Only the provided fields are changed.
 *
 * @param id - Conversation ID.
 * @param data - Fields to update.
 * @returns The updated conversation.
 * @throws If no conversation with the given ID exists (Prisma `P2025`).
 */
export const updateConversation = async (id: string, data: {
  moreDetails?: any;
  contactName?: string;
  lastMessage?: string | null;
  lastMessageAt?: Date | null;
  unread?: boolean;
  avatar?: string | null;
}) => prisma.conversation.update({ where: { id }, data });
