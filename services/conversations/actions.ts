/**
 * TODO: fix this file, contains hardcoded neupkishor username
 * line 359, 447
 */

'use server';

import { countConversations, getConversation, listConversations, type ConversationFilter } from '@/services/conversations';
import { listMessagesByConversationId, listMessagesBefore, listMessagesAfter } from '@/services/messages';
import { listAccounts } from '@/services/accounts';
import { decrypt } from '@neup/core/helpers/crypto';
import { getInstagramConversations } from '@/services/platform/instagram/conversations.list';
import { getInstagramConversationMessages, type InstagramConversationMessagesResponse } from '@/services/platform/instagram/conversation.messages.list';
import { findConversationByContactAndChannel, findConversationByPlatformId, createConversation, updateConversation } from '@/services/conversations';
import { upsertCachedMessage } from '@/services/message-cache';
import { getFacebookConversationMessages } from '@/services/platform/facebook/conversation.messages.list';

/**
 * Converts an optional Date into an ISO 8601 string so it can be safely
 * passed from server actions to client components.
 * @param value The date to convert, or null/undefined if not set.
 * @returns The ISO string representation of the date, or null if no date was given.
 */
const toIso = (value?: Date | null) => (value ? value.toISOString() : null);

/**
 * Converts a conversation record into a plain, serializable object by turning
 * its `lastMessageAt` and `createdAt` dates into ISO strings.
 * @param conversation The conversation record returned by getConversation, or null if none was found.
 * @returns The conversation with its date fields serialized, or null if no conversation was provided.
 */
const serializeConversation = (conversation: Awaited<ReturnType<typeof getConversation>>) => conversation ? { ...conversation, lastMessageAt: toIso(conversation.lastMessageAt), createdAt: toIso(conversation.createdAt) } : null;

/**
 * Converts a message record into a plain, serializable object by turning its
 * `messageTime` date into an ISO string.
 * @param message A message record from listMessagesByConversationId.
 * @returns The message with `messageTime` serialized, or null if no message was provided.
 */
const serializeMessage = (message: Awaited<ReturnType<typeof listMessagesByConversationId>>[number]) => message ? { ...message, messageTime: toIso(message.messageTime) } : null;

/**
 * Rebuilds a conversation's local message history from the platform API.
 * Looks up the connected account for the conversation's channel, fetches up to
 * 50 messages from Facebook or Instagram, caches them in the database, and then
 * updates the conversation's last message and fetch-state range. Does nothing
 * if the platform conversation ID or the account token is missing, or if the
 * platform is not Facebook or Instagram.
 * @param conversation The local conversation record whose messages should be restored.
 * @returns Resolves when the restore is finished; returns nothing.
 */
async function restoreConversationMessages(conversation: NonNullable<Awaited<ReturnType<typeof getConversation>>>) {
  const platformInfo = (conversation.moreDetails as { platformInfo?: { conversationId?: string; pageId?: string } } | null)?.platformInfo;
  const platformConversationId = platformInfo?.conversationId;
  if (!platformConversationId) return;

  const account = (await listAccounts()).find((item) =>
    item.id === conversation.channelId || item.platformId === conversation.channelId
  );
  if (!account?.encryptedToken) return;
  const accessToken = await decrypt(account.encryptedToken);
  const platform = conversation.platform.toLowerCase();

  if (platform === 'facebook') {
    const response = await getFacebookConversationMessages({ conversationId: platformConversationId, accessToken });
    await Promise.all((response.messages?.data ?? []).slice(0, 50).map((message) => upsertCachedMessage({
      conversationId: conversation.id,
      platform: 'Facebook',
      platformMessageId: `fb_msg:${account.id}:${message.id}`,
      text: message.message ?? '',
      sender: message.from?.id ?? 'unknown',
      direction: message.from?.id === (platformInfo.pageId ?? account.platformId) ? 'sent' : 'received',
      timestamp: message.created_time ? new Date(message.created_time) : new Date(),
      moreDetails: { from: message.from, to: message.to, attachments: message.attachments },
    })));
  } else if (platform === 'instagram') {
    const response = await getInstagramConversationMessages({ conversationId: platformConversationId, accessToken });
    await Promise.all((response.messages?.data ?? []).slice(0, 50).map((message) => upsertCachedMessage({
      conversationId: conversation.id,
      platform: 'Instagram',
      platformMessageId: message.id,
      text: message.message ?? '',
      sender: message.from?.id ?? 'unknown',
      direction: message.from?.id === account.platformId ? 'sent' : 'received',
      timestamp: message.created_time ? new Date(message.created_time) : new Date(),
      moreDetails: { from: message.from, to: message.to, attachments: message.attachments, replyTo: message.reply_to },
    })));
  } else {
    return;
  }

  const restored = await listMessagesByConversationId(conversation.id);
  const latest = restored[restored.length - 1];
  if (latest) {
    await updateConversation(conversation.id, {
      lastMessage: latest.content,
      lastMessageAt: latest.messageTime,
      moreDetails: {
        ...((conversation.moreDetails as Record<string, unknown> | null) ?? {}),
        fetchState: {
          messageSince: restored[0].messageTime.toISOString(),
          messageUpto: latest.messageTime.toISOString(),
        },
      },
    });
  }
}

/**
 * Server action to list conversations one page at a time, with optional
 * platform and filter options.
 * @param params.skip Number of conversations to skip, used for pagination. Defaults to 0.
 * @param params.take Number of conversations to return. Defaults to 10.
 * @param params.platform Optional platform to restrict the list to.
 * @param params.filter Optional conversation filter (for example, unread only).
 * @returns An object with `items` (the serialized conversations for this page),
 * `hasMore` (true if the page was full, so more may exist), `total` (the count
 * matching the platform and filter), and `unreadTotal` (the unread count for the platform).
 */
export async function listConversationsAction({ skip = 0, take = 10, platform, filter }: { skip?: number; take?: number; platform?: string; filter?: ConversationFilter } = {}) {
  const conversations = await listConversations({ skip, take, platform, filter });
  const [total, unreadTotal] = await Promise.all([
    countConversations(platform, filter),
    countConversations(platform, 'unread'),
  ]);
  return {
    items: conversations.map((conversation) => serializeConversation(conversation)!),
    hasMore: conversations.length === take,
    total,
    unreadTotal,
  };
}

/**
 * Server action to fetch a single conversation by its ID.
 * @param id The ID of the local conversation.
 * @returns The serialized conversation, or null if it was not found.
 */
export async function getConversationAction(id: string) { return serializeConversation(await getConversation(id)); }

/**
 * Server action to update the fetch-state metadata of a conversation, which
 * tracks the range of messages already loaded. The given values are merged into
 * the existing fetch state, so fields not provided are kept.
 * @param id The ID of the local conversation.
 * @param metadata The fetch-state fields to set.
 * @param metadata.messageSince ISO timestamp of the oldest message loaded.
 * @param metadata.messageUpto ISO timestamp of the newest message loaded.
 * @param metadata.firstMessageOn ISO timestamp of the very first message in the conversation.
 * @returns The updated serialized conversation, or null if the conversation was not found.
 */
export async function updateConversationFetchMetadataAction(id: string, metadata: { messageSince?: string; messageUpto?: string; firstMessageOn?: string }) {
  const conversation = await getConversation(id);
  if (!conversation) return null;
  return serializeConversation(await updateConversation(id, {
    moreDetails: {
      ...((conversation.moreDetails as Record<string, unknown> | null) ?? {}),
      fetchState: {
        ...(((conversation.moreDetails as { fetchState?: Record<string, unknown> } | null)?.fetchState) ?? {}),
        ...metadata,
      },
    },
  }));
}

/**
 * Server action to list the messages of a conversation in chronological order.
 * Loads the latest 30 messages when no fetch range has been recorded yet, or
 * all messages once one has. If the database has no messages, it restores them
 * from the platform first. When the fetch range is not yet recorded, it saves
 * the range of the messages returned.
 * @param conversationId The ID of the local conversation.
 * @returns An array of serialized messages sorted from oldest to newest.
 */
export async function listConversationMessagesAction(conversationId: string) {
  const conversation = await getConversation(conversationId);
  const fetchState = (conversation?.moreDetails as { fetchState?: { messageSince?: string; messageUpto?: string; firstMessageOn?: string } } | null)?.fetchState;
  const messages = await listMessagesByConversationId(conversationId, fetchState?.messageSince && fetchState?.messageUpto ? undefined : 30);
  if (messages.length === 0 && conversation) {
    await restoreConversationMessages(conversation);
    return (await listMessagesByConversationId(conversationId)).map((message) => serializeMessage(message)!);
  }
  const serialized = messages.map((message) => serializeMessage(message)!).sort((a, b) =>
    new Date(a.messageTime ?? 0).getTime() - new Date(b.messageTime ?? 0).getTime()
  );

  if (serialized.length > 0 && (!fetchState?.messageSince || !fetchState?.messageUpto)) {
    const first = serialized[0].messageTime;
    const last = serialized[serialized.length - 1].messageTime;
    await updateConversationFetchMetadataAction(conversationId, {
      messageSince: first ?? undefined,
      messageUpto: last ?? undefined,
    });
  }

  return serialized;
}

/**
 * Parameters for the platform message-paging functions.
 * @property localConversationId The ID of the local conversation.
 * @property cursor Optional paging cursor from the platform API.
 */
type MessagePageParams = { localConversationId: string; cursor?: string };

/**
 * Server action to load messages older than a given time from the database.
 * @param conversationId The ID of the local conversation.
 * @param before ISO timestamp; only messages older than this are returned.
 * @returns An array of serialized messages sorted from oldest to newest.
 */
export async function getOlderMessagesFromDatabase(conversationId: string, before: string) {
  const rows = await listMessagesBefore(conversationId, new Date(before));
  return rows.reverse().map((message) => serializeMessage(message)!);
}

/**
 * Server action to load messages newer than a given time from the database.
 * @param conversationId The ID of the local conversation.
 * @param after ISO timestamp; only messages newer than this are returned.
 * @returns An array of the serialized messages.
 */
export async function getNewerMessagesFromDatabase(conversationId: string, after: string) {
  return (await listMessagesAfter(conversationId, new Date(after))).map((message) => serializeMessage(message)!);
}

/**
 * Caches a page of platform messages (up to 50) in the database and updates the
 * conversation's last message from the newest stored message.
 * @param localConversationId The ID of the local conversation the messages belong to.
 * @param platform The platform the messages came from.
 * @param page The page of messages returned by the platform API.
 * @param account The connected account used to fetch the page; its ID and platform ID are used to build message IDs and detect sent messages.
 * @returns The same `page` that was passed in, unchanged.
 */
async function saveMessagePage(localConversationId: string, platform: 'Facebook' | 'Instagram', page: any, account: any) {
  await Promise.all((page.messages?.data ?? []).slice(0, 50).map((message: any) => upsertCachedMessage({
    conversationId: localConversationId,
    platform,
    platformMessageId: platform === 'Facebook' ? `fb_msg:${account.id}:${message.id}` : message.id,
    text: message.message ?? '',
    sender: message.from?.id ?? 'unknown',
    direction: message.from?.id === account.platformId ? 'sent' : 'received',
    timestamp: message.created_time ? new Date(message.created_time) : new Date(),
    moreDetails: { from: message.from, to: message.to, attachments: message.attachments, replyTo: message.reply_to },
  })));
  const saved = await listMessagesByConversationId(localConversationId);
  const latest = saved[saved.length - 1];
  if (latest) await updateConversation(localConversationId, { lastMessage: latest.content, lastMessageAt: latest.messageTime });
  return page;
}

/**
 * Server action to fetch an older page of Facebook messages for a conversation
 * from the Facebook API and cache it in the database.
 * @param params.localConversationId The ID of the local conversation.
 * @param params.cursor Optional paging cursor, sent to the API as `before`.
 * @returns The page of messages returned by the Facebook API.
 * @throws If the conversation is not found, or its account token or platform conversation ID is missing.
 */
export async function getOlderFacebookMessages({ localConversationId, cursor }: MessagePageParams) {
  const conversation = await getConversation(localConversationId);
  if (!conversation) throw new Error('Conversation not found.');
  const info = (conversation.moreDetails as any)?.platformInfo;
  const account = (await listAccounts()).find((item) => item.id === conversation.channelId || item.platformId === conversation.channelId);
  if (!account?.encryptedToken || !info?.conversationId) throw new Error('Facebook conversation credentials are missing.');
  const page = await getFacebookConversationMessages({ conversationId: info.conversationId, accessToken: await decrypt(account.encryptedToken), before: cursor });
  return saveMessagePage(localConversationId, 'Facebook', page, account);
}

/**
 * Server action to fetch a newer page of Facebook messages for a conversation
 * from the Facebook API and cache it in the database.
 * @param params.localConversationId The ID of the local conversation.
 * @param params.cursor Optional paging cursor, sent to the API as `after`.
 * @returns The page of messages returned by the Facebook API.
 * @throws If the conversation is not found, or its account token or platform conversation ID is missing.
 */
export async function getNewerFacebookMessages({ localConversationId, cursor }: MessagePageParams) {
  const conversation = await getConversation(localConversationId);
  if (!conversation) throw new Error('Conversation not found.');
  const info = (conversation.moreDetails as any)?.platformInfo;
  const account = (await listAccounts()).find((item) => item.id === conversation.channelId || item.platformId === conversation.channelId);
  if (!account?.encryptedToken || !info?.conversationId) throw new Error('Facebook conversation credentials are missing.');
  const page = await getFacebookConversationMessages({ conversationId: info.conversationId, accessToken: await decrypt(account.encryptedToken), after: cursor });
  return saveMessagePage(localConversationId, 'Facebook', page, account);
}

/**
 * Server action to fetch a page of Instagram messages for a conversation from
 * the Instagram API and cache it in the database. The cursor is sent to the API
 * as `after`.
 * @param params.localConversationId The ID of the local conversation.
 * @param params.cursor Optional paging cursor, sent to the API as `after`.
 * @returns The page of messages returned by the Instagram API.
 * @throws If the conversation is not found, or its account token or platform conversation ID is missing.
 */
export async function getOlderInstagramMessages({ localConversationId, cursor }: MessagePageParams) {
  const conversation = await getConversation(localConversationId);
  if (!conversation) throw new Error('Conversation not found.');
  const info = (conversation.moreDetails as any)?.platformInfo;
  const account = (await listAccounts()).find((item) => item.id === conversation.channelId || item.platformId === conversation.channelId);
  if (!account?.encryptedToken || !info?.conversationId) throw new Error('Instagram conversation credentials are missing.');
  const page = await getInstagramConversationMessages({ conversationId: info.conversationId, accessToken: await decrypt(account.encryptedToken), after: cursor });
  return saveMessagePage(localConversationId, 'Instagram', page, account);
}

/**
 * Server action to load older Instagram messages for a conversation. If a
 * `before` time is given and older messages already exist in the database, it
 * returns up to 50 of those. Otherwise it fetches a page from the Instagram API,
 * caches it, and returns the latest 50 stored messages.
 * @param conversationId The ID of the local conversation.
 * @param before Optional ISO timestamp; older stored messages are returned first if any exist.
 * @param cursor Optional paging cursor for the Instagram API.
 * @returns For database hits, an object with `messages` (oldest to newest) and `next` (the `before` value).
 * For API fetches, an object with `messages`, `next` (the API's next-page link or null),
 * `firstMessageOn` (ISO time of the oldest stored message or null), and `hadDatabaseMessages`
 * (whether the conversation had stored messages before the fetch).
 */
export async function loadOlderInstagramMessagesAction(conversationId: string, before?: string, cursor?: string) {
  const current = await listMessagesByConversationId(conversationId);
  if (before) {
    const stored = await listMessagesBefore(conversationId, new Date(before), 50);
    if (stored.length) return { messages: stored.reverse().map((message) => serializeMessage(message)!), next: before };
  }
  const page = await getOlderInstagramMessages({ localConversationId: conversationId, cursor });
  const refreshed = await listMessagesByConversationId(conversationId);
  return {
    messages: refreshed.slice(-50).map((message) => serializeMessage(message)!),
    next: page.messages?.paging?.next ?? null,
    firstMessageOn: refreshed[0]?.messageTime?.toISOString() ?? null,
    hadDatabaseMessages: current.length > 0,
  };
}

/**
 * Server action to fetch a page of newer Instagram messages for a conversation.
 * Currently delegates to getOlderInstagramMessages, so it behaves identically.
 * @param params.localConversationId The ID of the local conversation.
 * @param params.cursor Optional paging cursor, sent to the API as `after`.
 * @returns The page of messages returned by the Instagram API.
 */
export async function getNewerInstagramMessages({ localConversationId, cursor }: MessagePageParams) {
  return getOlderInstagramMessages({ localConversationId, cursor });
}

/**
 * Server action to sync the latest Instagram inbox into the local database.
 * Finds the connected Instagram account owned by `neupkishor`, fetches up to 20
 * recent conversations, and for each one creates or updates the local
 * conversation and caches its messages (up to 50). A failure on one
 * conversation is logged and does not stop the others.
 * @returns The conversation list returned by the Instagram API, or null if no
 * connected Instagram account was found or the inbox fetch failed.
 */
export async function listInstagramConversationsAction() {
  const accounts = await listAccounts({ owner: 'neupkishor' });
  const account = accounts.find((item) => item.platform.toLowerCase() === 'instagram');

  if (!account?.platformId || !account.encryptedToken) {
    console.log('[Instagram conversations] no connected Instagram account found');
    return null;
  }

  try {
    const accessToken = await decrypt(account.encryptedToken);
    const conversations = await getInstagramConversations({
      igUserId: account.platformId,
      accessToken,
      limit: 20,
    });
    console.log('[Instagram conversations] fetched from inbox', conversations);

    const recentConversations = conversations.data.slice(0, 20);
    await Promise.all(recentConversations.map(async (conversation) => {
      try {
        const detail = await getInstagramConversationMessages({
          conversationId: conversation.id,
          accessToken,
        });
        const latestMessage = detail.messages?.data?.[0];
        const contact = latestMessage
          ? latestMessage.from?.id === account.platformId
            ? latestMessage.to?.data?.[0]
            : latestMessage.from
          : undefined;
        const existing = await findConversationByPlatformId(conversation.id)
          ?? await findConversationByContactAndChannel(conversation.id, account.platformId!);
        const values = {
          contactName: contact?.username || contact?.id || 'Instagram user',
          lastMessage: latestMessage?.message ?? null,
          lastMessageAt: latestMessage?.created_time ? new Date(latestMessage.created_time) : new Date(conversation.updated_time),
          unread: false,
          avatar: (contact?.username || contact?.id || 'IG').slice(0, 2).toUpperCase(),
        };

        const localConversation = existing ? await updateConversation(existing.id, {
            ...values,
            moreDetails: { platformInfo: { conversationId: conversation.id, recipientId: contact?.id } },
          }) : await createConversation({
            contactId: conversation.id,
            channelId: account.platformId!,
            platform: 'Instagram',
            moreDetails: { platformInfo: { conversationId: conversation.id, recipientId: contact?.id } },
            ...values,
          });
        await Promise.all((detail.messages?.data ?? []).slice(0, 50).map((message) => upsertCachedMessage({
          conversationId: localConversation.id,
          platform: 'Instagram',
          platformMessageId: message.id,
          text: message.message ?? '',
          sender: message.from?.id ?? 'unknown',
          direction: message.from?.id === account.platformId ? 'sent' : 'received',
          timestamp: message.created_time ? new Date(message.created_time) : new Date(),
          moreDetails: { from: message.from, to: message.to, attachments: message.attachments, replyTo: message.reply_to },
        })));
        console.log('[Instagram conversations] synced conversation', { conversationId: conversation.id, latestMessage });
      } catch (error) {
        console.error('[Instagram conversations] failed to sync conversation', {
          conversationId: conversation.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }));

    return conversations;
  } catch (error) {
    console.error('[Instagram conversations] inbox fetch failed', error);
    return null;
  }
}

/**
 * Server action to fetch the messages of an Instagram conversation from the
 * Instagram API and cache them in the database.
 * Uses the connected Instagram account owned by `neupkishor` and the platform
 * conversation ID stored on the local conversation record.
 * @param conversationId The ID of the local conversation.
 * @param after Optional paging cursor, sent to the API as `after`.
 * @returns The messages response from the Instagram API, or null if no
 * connected Instagram account was found.
 * @throws If the local conversation has no Instagram conversation ID.
 */
export async function listInstagramConversationMessagesAction(conversationId: string, after?: string): Promise<InstagramConversationMessagesResponse | null> {
  const accounts = await listAccounts({ owner: 'neupkishor' });
  const account = accounts.find((item) => item.platform.toLowerCase() === 'instagram');

  if (!account?.encryptedToken) {
    console.log('[Instagram conversation messages] no connected Instagram account found');
    return null;
  }

  const accessToken = await decrypt(account.encryptedToken);
  const localConversation = await getConversation(conversationId);
  const instagramConversationId = (localConversation?.moreDetails as { platformInfo?: { conversationId?: string } } | null)
    ?.platformInfo?.conversationId;

  if (!instagramConversationId) {
    throw new Error('Instagram conversation ID is missing from the local conversation record.');
  }

  const response = await getInstagramConversationMessages({ conversationId: instagramConversationId, accessToken, after });
  await Promise.all((response.messages?.data ?? []).map((message) => upsertCachedMessage({
    conversationId,
    platform: 'Instagram',
    platformMessageId: message.id,
    text: message.message ?? '',
    sender: message.from?.id ?? 'unknown',
    timestamp: message.created_time ? new Date(message.created_time) : new Date(),
    moreDetails: { from: message.from, to: message.to, attachments: message.attachments, replyTo: message.reply_to },
  })));
  return response;
}
