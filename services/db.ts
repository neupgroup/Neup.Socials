'use server';

import { dataStore } from '@/lib/data-store';

const PAGE_SIZE = {
  accounts: 10,
  posts: 15,
  uploads: 10,
};

const toIso = (value?: Date | null) => (value ? value.toISOString() : null);

const serializeAccount = (account: Awaited<ReturnType<typeof dataStore.accounts.getById>>) =>
  account
    ? {
        ...account,
        connectedOn: toIso(account.connectedOn),
        updatedAt: toIso(account.updatedAt),
        lastSyncedAt: toIso(account.lastSyncedAt),
        createdAt: toIso(account.createdAt),
      }
    : null;

const serializePost = (post: Awaited<ReturnType<typeof dataStore.posts.getById>>) =>
  post
    ? {
        ...post,
        createdOn: toIso(post.createdOn),
      }
    : null;

const serializePostCollection = (postCollection: Awaited<ReturnType<typeof dataStore.postCollections.getById>>) =>
  postCollection
    ? {
        ...postCollection,
        createdAt: toIso(postCollection.createdAt),
        publishedAt: toIso(postCollection.publishedAt),
        scheduledAt: toIso(postCollection.scheduledAt),
      }
    : null;

const serializeUpload = (upload: Awaited<ReturnType<typeof dataStore.uploads.getById>>) =>
  upload
    ? {
        ...upload,
        uploadedOn: toIso(upload.uploadedOn),
      }
    : null;

const serializeError = (error: Awaited<ReturnType<typeof dataStore.errors.getById>>) =>
  error
    ? {
        ...error,
        timestamp: toIso(error.timestamp),
      }
    : null;

const serializeConversation = (conversation: Awaited<ReturnType<typeof dataStore.conversations.getById>>) =>
  conversation
    ? {
        ...conversation,
        lastMessageAt: toIso(conversation.lastMessageAt),
        createdAt: toIso(conversation.createdAt),
      }
    : null;

const serializeMessage = (message: Awaited<ReturnType<typeof dataStore.messages.findByPlatformMessageId>>) =>
  message
    ? {
        ...message,
        timestamp: toIso(message.timestamp),
      }
    : null;

export async function listAccountsAction({
  owner,
  search,
  skip = 0,
}: {
  owner?: string;
  search?: string;
  skip?: number;
}) {
  const [accounts, total] = await Promise.all([
    dataStore.accounts.list({ owner, search, skip, take: PAGE_SIZE.accounts }),
    dataStore.accounts.count({ owner, search }),
  ]);

  return {
    items: accounts.map((account) => serializeAccount(account)!),
    hasMore: skip + accounts.length < total,
  };
}

export async function getAccountAction(id: string) {
  return serializeAccount(await dataStore.accounts.getById(id));
}

export async function getAccountsByIdsAction(ids: string[]) {
  const accounts = await dataStore.accounts.getByIds(ids);
  return accounts.map((account) => serializeAccount(account)!);
}

export async function getWhatsAppAccountsAction() {
  const accounts = await dataStore.accounts.getWhatsAppAccounts();
  return accounts.map((account) => serializeAccount(account)!);
}

export async function createConnectedAccountAction(data: {
  platform: string;
  platformId?: string | null;
  name?: string | null;
  username?: string | null;
  encryptedToken?: string | null;
  category?: string | null;
  status?: string | null;
  owner?: string | null;
  nameStatus?: string | null;
  metadata?: unknown;
}) {
  const account = await dataStore.accounts.create(data);
  return serializeAccount(account);
}

export async function listPostsAction({
  search,
  accountId,
  skip = 0,
}: {
  search?: string;
  accountId?: string;
  skip?: number;
}) {
  const [posts, total] = await Promise.all([
    dataStore.posts.list({ search, accountId, skip, take: PAGE_SIZE.posts }),
    dataStore.posts.count({ search, accountId }),
  ]);

  return {
    items: posts.map((post) => serializePost(post)!),
    hasMore: skip + posts.length < total,
  };
}

export async function getPostAction(id: string) {
  return serializePost(await dataStore.posts.getById(id));
}

export async function deletePostAction(id: string) {
  await dataStore.posts.delete(id);
  return { success: true };
}

export async function getPostCollectionAction(id: string) {
  return serializePostCollection(await dataStore.postCollections.getById(id));
}

export async function createPostCollectionDraftAction(data: {
  content: string;
  mediaUrls: string[];
  status: string;
  author?: string | null;
  postsId?: string[];
  accountIds?: string[];
  platforms?: string[];
  ctaType?: string | null;
  ctaLink?: string | null;
}) {
  const postCollection = await dataStore.postCollections.create(data);
  return serializePostCollection(postCollection);
}

export async function updatePostCollectionAction(
  id: string,
  data: {
    content?: string;
    mediaUrls?: string[];
    status?: string;
    author?: string | null;
    postsId?: string[];
    accountIds?: string[];
    platforms?: string[];
    ctaType?: string | null;
    ctaLink?: string | null;
    publishedAt?: string | null;
    scheduledAt?: string | null;
  }
) {
  const postCollection = await dataStore.postCollections.update(id, {
    ...data,
    publishedAt: data.publishedAt === undefined ? undefined : data.publishedAt ? new Date(data.publishedAt) : null,
    scheduledAt: data.scheduledAt === undefined ? undefined : data.scheduledAt ? new Date(data.scheduledAt) : null,
  });

  return serializePostCollection(postCollection);
}

export async function cancelScheduledPostCollectionAction(id: string) {
  const postCollection = await dataStore.postCollections.update(id, {
    status: 'Draft',
    scheduledAt: null,
  });

  return serializePostCollection(postCollection);
}

export async function deletePostCollectionAction(id: string) {
  await dataStore.postCollections.delete(id);
  return { success: true };
}

export async function getPostCollectionPostsAction(ids: string[]) {
  const posts = await dataStore.posts.getByIds(ids);
  return posts.map((post) => serializePost(post)!);
}

export async function getPostCollectionsByMediaUrlAction(filePath: string) {
  const postCollections = await dataStore.postCollections.findByMediaUrl(filePath);
  return postCollections.map((postCollection) => serializePostCollection(postCollection)!);
}

export async function listUploadsAction({
  search,
  skip = 0,
}: {
  search?: string;
  skip?: number;
}) {
  const [uploads, total] = await Promise.all([
    dataStore.uploads.list({ search, skip, take: PAGE_SIZE.uploads }),
    dataStore.uploads.count({ search }),
  ]);

  return {
    items: uploads.map((upload) => serializeUpload(upload)!),
    hasMore: skip + uploads.length < total,
  };
}

export async function listAllUploadsAction() {
  const uploads = await dataStore.uploads.listForLibrary();
  return uploads.map((upload) => serializeUpload(upload)!);
}

export async function getUploadAction(id: string) {
  return serializeUpload(await dataStore.uploads.getById(id));
}

export async function updateUploadAction(id: string, data: { contentName?: string | null }) {
  const upload = await dataStore.uploads.update(id, data);
  return serializeUpload(upload);
}

export async function listErrorsAction() {
  const errors = await dataStore.errors.list();
  return errors.map((error) => serializeError(error)!);
}

export async function getErrorAction(id: string) {
  return serializeError(await dataStore.errors.getById(id));
}

export async function listSyncLogsAction(accountId: string) {
  const account = await dataStore.accounts.getById(accountId);
  if (!account) {
    return [];
  }

  const [entries, legacyLogs] = await Promise.all([
    dataStore.syncLogEntries.listByProfile({
      forProfile: accountId,
      take: 300,
    }),
    dataStore.syncLogs.listByAccountId(accountId),
  ]);

  const mappedEntries = entries.map((entry) => ({
    id: entry.id,
    type: entry.type,
    platform: entry.platform,
    forProfile: entry.forProfile,
    sinceTime: toIso(entry.sinceTime),
    toTime: toIso(entry.toTime),
    moreInfo: entry.moreInfo,
    createdOn: toIso(entry.createdOn),
    source: 'sync_log',
  }));

  const mappedLegacy = legacyLogs.map((log) => {
    const range =
      log.range && typeof log.range === 'object' && !Array.isArray(log.range)
        ? (log.range as { since?: string; until?: string })
        : {};

    return {
      id: `legacy_${log.id}`,
      type: 'posts',
      platform: account.platform.toLowerCase(),
      forProfile: accountId,
      sinceTime: range.since ?? null,
      toTime: range.until ?? null,
      moreInfo: {
        status: log.status,
        postsSynced: log.postsSynced,
        errorMessage: log.errorMessage,
        details: log.details,
        source: 'legacy.sync_logs',
      },
      createdOn: toIso(log.syncedAt),
      source: 'sync_logs',
    };
  });

  return [...mappedEntries, ...mappedLegacy].sort((a, b) => {
    const aTime = a.createdOn ? new Date(a.createdOn).getTime() : 0;
    const bTime = b.createdOn ? new Date(b.createdOn).getTime() : 0;
    return bTime - aTime;
  });
}

export async function listConversationsAction() {
  const conversations = await dataStore.conversations.list();
  return conversations.map((conversation) => serializeConversation(conversation)!);
}

export async function getConversationAction(id: string) {
  return serializeConversation(await dataStore.conversations.getById(id));
}

export async function listConversationMessagesAction(conversationId: string) {
  const messages = await dataStore.messages.listByConversationId(conversationId);
  return messages.map((message) => serializeMessage(message)!);
}

export async function recordOutgoingMessageAction({
  conversationId,
  channelId,
  contactId,
  contactName,
  platform,
  text,
  avatar,
}: {
  conversationId?: string;
  channelId: string;
  contactId: string;
  contactName: string;
  platform: string;
  text: string;
  avatar?: string | null;
}) {
  let conversation =
    conversationId ? await dataStore.conversations.getById(conversationId) : null;

  if (!conversation) {
    conversation =
      (await dataStore.conversations.findByContactAndChannel(contactId, channelId)) ??
      (await dataStore.conversations.findByContactAndChannel(
        contactId.startsWith('+') ? contactId.slice(1) : `+${contactId}`,
        channelId
      ));
  }

  if (!conversation) {
    conversation = await dataStore.conversations.create({
      contactId,
      contactName,
      channelId,
      platform,
      lastMessage: text,
      lastMessageAt: new Date(),
      unread: false,
      avatar: avatar ?? contactId.slice(-2),
    });
  } else {
    conversation = await dataStore.conversations.update(conversation.id, {
      contactName,
      lastMessage: text,
      lastMessageAt: new Date(),
      unread: false,
      avatar: avatar ?? conversation.avatar,
    });
  }

  const message = await dataStore.messages.create({
    conversationId: conversation.id,
    text,
    sender: 'agent',
    timestamp: new Date(),
  });

  return {
    conversation: serializeConversation(conversation),
    message: serializeMessage(message),
  };
}
