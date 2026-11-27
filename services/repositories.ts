/*
::neup.documentation::services-repositories
::title Prisma-backed service repositories

Provides the existing domain repository operations from the services layer.
This keeps database access behind services and removes the deleted core.v2
data-store dependency.
::end
*/

import { prisma } from '@neup/core/database/prisma';
import { logger } from '@neup/logica/logger';

/** Loosely typed Prisma model delegate (e.g. `prisma.post`). */
type Delegate = any;

/**
 * Looks up a Prisma model delegate by name.
 *
 * @param name - Prisma client property name (e.g. `'connectedAccount'`).
 * @returns The delegate for that model.
 */
const model = (name: string): Delegate => (prisma as any)[name];

/**
 * Builds a `{ where: { id } }` argument for single-record Prisma calls.
 *
 * @param id - Record ID.
 */
const byId = (id: string) => ({ where: { id } });

/**
 * Builds the `where` clause for connected-account queries.
 *
 * Filters by `owner` when given. A pre-built `searchFilter` takes precedence;
 * otherwise `search` becomes a case-insensitive "contains" match across
 * `name`, `username`, and `platform`.
 *
 * @param args - Filter options.
 * @param args.owner - Restrict to this owner.
 * @param args.searchFilter - Ready-made Prisma `where` fragment (wins over `search`).
 * @param args.search - Free-text search term.
 */
const accountWhere = (args: any = {}) => ({
  ...(args.owner ? { owner: args.owner } : {}),
  ...(args.searchFilter ?? (args.search ? {
    OR: ['name', 'username', 'platform'].map((field) => ({ [field]: { contains: args.search, mode: 'insensitive' } })),
  } : {})),
});

/**
 * Repository implementations, keyed by store name and then by operation.
 *
 * Only the stores and operations listed here exist. A store that is not
 * defined falls back to the throwing `generic` proxy (see {@link dataStore}).
 * A store that is defined but lacks a particular method yields `undefined`
 * for that method.
 */
const stores: Record<string, Record<string, (...args: any[]) => Promise<any>>> = {
  /** Connected social accounts (Prisma model `connectedAccount`). */
  accounts: {
    /** Lists accounts, newest `connectedOn` first by default. Accepts `owner`, `search`, `searchFilter`, `skip`, `take`, `orderBy`. */
    list: (args = {}) => model('connectedAccount').findMany({ where: accountWhere(args), skip: args.skip, take: args.take, orderBy: args.orderBy ?? { connectedOn: 'desc' } }),
    
    /** Counts accounts matching the same filters as `list`. */
    count: (args = {}) => model('connectedAccount').count({ where: accountWhere(args) }),
    
    /** Gets an account by ID, or `null`. */
    getById: (id) => model('connectedAccount').findUnique(byId(id)),
    
    /** Gets accounts whose ID is in `ids`. */
    getByIds: (ids) => model('connectedAccount').findMany({ where: { id: { in: ids } } }),
    
    /** Lists all WhatsApp accounts. */
    getWhatsAppAccounts: () => model('connectedAccount').findMany({ where: { platform: 'WhatsApp' } }),
    
    /** Finds the first account matching owner, platform, and platform ID. */
    findByOwnerPlatformId: (owner, platform, platformId) => model('connectedAccount').findFirst({ where: { owner, platform, platformId } }),
    
    /** Finds the first account matching an arbitrary `where` on platform fields. */
    findByPlatformPlatformId: (where) => model('connectedAccount').findFirst({ where }),
    
    /** Finds the WhatsApp account with the given platform ID. */
    findWhatsAppAccount: (platformId) => model('connectedAccount').findFirst({ where: { platform: 'WhatsApp', platformId } }),
    
    /** Creates an account. */
    create: (data) => model('connectedAccount').create({ data }),
    
    /** Updates an account by ID. */
    update: (id, data) => model('connectedAccount').update({ where: { id }, data }),
    
    /** Deletes an account by ID. */
    delete: (id) => model('connectedAccount').delete(byId(id)),
    
    /**
     * Creates or updates an account keyed by the (platform, platformId, owner)
     * unique constraint. Accepts both the legacy shape (provider fields nested
     * under `data`) and the flat shape; both are merged into one flat record.
     */
    upsertByOwnerPlatformId: (data) => {
      // OAuth callers historically wrapped provider fields in `data`, while
      // connected_accounts is a flat Prisma model. Normalize both shapes here.
      const { data: nestedData, ...accountData } = data;
      const fields = nestedData && typeof nestedData === 'object' ? nestedData : {};
      const record = { ...accountData, ...fields };
      return model('connectedAccount').upsert({
        where: {
          platform_platformId_owner: {
            platform: record.platform,
            platformId: record.platformId,
            owner: record.owner,
          },
        },
        create: record,
        update: record,
      });
    },
  },

  /** Local application accounts (Prisma model `account`). */
  localAccounts: {
    /** Lists local accounts, newest `createdOn` first. */
    list: () => model('account').findMany({ orderBy: { createdOn: 'desc' } }),
    /** Gets a local account by ID, or `null`. */
    getById: (accountId) => model('account').findUnique({ where: { id: accountId } }),
    /** Updates a local account by ID. */
    update: (accountId, data) => model('account').update({ where: { id: accountId }, data }),
  },
  /** Posts (Prisma model `post`). */
  posts: {
    /** Lists posts, newest `createdOn` first by default. Accepts `accountId`, `searchFilter`, `skip`, `take`, `orderBy`. */
    list: (args = {}) => model('post').findMany({
      where: {
        ...(args.accountId ? { accountId: args.accountId } : {}),
        ...(args.searchFilter ?? {}),
      },
      skip: args.skip,
      take: args.take,
      orderBy: args.orderBy ?? { createdOn: 'desc' },
    }),
    /** Counts posts matching `accountId` and `searchFilter`. */
    count: (args = {}) => model('post').count({
      where: {
        ...(args.accountId ? { accountId: args.accountId } : {}),
        ...(args.searchFilter ?? {}),
      },
    }),
    /** Gets a post by ID, or `null`. */
    getById: (id) => model('post').findUnique(byId(id)),
    /** Gets posts whose ID is in `ids`. */
    getByIds: (ids) => model('post').findMany({ where: { id: { in: ids } } }),
    /**
     * For one account, returns the posts whose platform post ID is in
     * `platformPostIds`, as `{ id, platformPostId, mediaUrls }`.
     */
    findExistingPlatformPostIds: (accountId, platformPostIds) =>
      model('post').findMany({
        where: { accountId, platformPostId: { in: platformPostIds } },
        select: {
          id: true,
          platformPostId: true,
          mediaUrls: true,
        },
      }),
    /** Creates a post. */
    create: (data) => model('post').create({ data }),
    /** Creates many posts in one call; returns a count, not the records. */
    createMany: (data) => model('post').createMany({ data }),
    /** Updates a post by ID. */
    update: (id, data) => model('post').update({ where: { id }, data }),
    /** Deletes a post by ID. */
    delete: (id) => model('post').delete(byId(id)),
  },
  /** Comments attached to posts (Prisma model `postComment`). */
  postComments: {
    /** Creates or updates a post comment keyed by `commentId`. */
    upsertByCommentId: (data) => model('postComment').upsert({
      where: { commentId: data.commentId },
      create: data,
      update: data,
    }),
    /** Lists a post's comments, oldest first. Takes `{ postId, take? }`. */
    listByPostId: ({ postId, take }: { postId: string; take?: number }) => model('postComment').findMany({
      where: { postId },
      orderBy: { commentedOn: 'asc' },
      take,
    }),
    /** Gets a post comment by its `commentId`, or `null`. */
    getByCommentId: (commentId) => model('postComment').findUnique({ where: { commentId } }),
    /** Lists the most recent post comments, newest first. Takes `{ take = 100 }`. */
    listRecent: ({ take = 100 } = {}) => model('postComment').findMany({
      orderBy: { commentedOn: 'desc' },
      take,
    }),
  },
  /** Groups of posts (Prisma model `postCollection`). */
  postCollections: {
    /** Gets a collection by ID, or `null`. */
    getById: (id) => model('postCollection').findUnique(byId(id)),
    /** Creates a collection. */
    create: (data) => model('postCollection').create({ data }),
    /** Updates a collection by ID. */
    update: (id, data) => model('postCollection').update({ where: { id }, data }),
    /** Appends post IDs to the collection's `postsId` array. */
    appendPosts: (id, postsId) => model('postCollection').update({ where: { id }, data: { postsId: { push: postsId } } }),
    /** Deletes a collection by ID. */
    delete: (id) => model('postCollection').delete(byId(id)),
    /** Finds collections whose `mediaUrls` contains `filePath`. */
    findByMediaUrl: (filePath) => model('postCollection').findMany({ where: { mediaUrls: { has: filePath } } }),
  },
  /** Spaces (Prisma model `space`). */
  spaces: {
    /** Lists spaces with their `assets`, ordered by name. */
    list: () => model('space').findMany({ include: { assets: true }, orderBy: { name: 'asc' } }),
    /** Creates a space. */
    create: (data) => model('space').create({ data }),
  },
  /** Platform assets linked to spaces (Prisma model `spaceAsset`). */
  spaceAssets: {
    /**
     * Replaces all assets of a space: deletes the existing rows, then inserts
     * `assets`. The two steps are not wrapped in a transaction.
     */
    replaceForSpace: async (spaceId, assets) => {
      await model('spaceAsset').deleteMany({ where: { spaceId } });
      if (assets.length > 0) {
        await model('spaceAsset').createMany({ data: assets.map((asset: { platform: string; assetId: string }) => ({ ...asset, spaceId,})) });
      }
    },
  },
  /** Conversations (Prisma model `conversation`). */
  conversations: {
    /** Finds the first conversation for a contact and channel. */
    findByContactAndChannel: (contactId, channelId) => model('conversation').findFirst({ where: { contactId, channelId } }),
    /** Creates a conversation. */
    create: (data) => model('conversation').create({ data }),
    /** Updates a conversation by ID. */
    update: (id, data) => model('conversation').update({ where: { id }, data }),
    /** Lists conversations by `lastMessageAt` descending. Accepts `platform` (exact match) and `take` (default 100). */
    listRecent: (args = {}) => model('conversation').findMany({
      where: { ...(args.platform ? { platform: args.platform } : {}) },
      take: args.take ?? 100,
      orderBy: { lastMessageAt: 'desc' },
    }),
  },
  /** Messages (Prisma model `message`). */
  messages: {
    /** Finds a message by its unique platform message ID, or `null`. */
    findByPlatformMessageId: (platformMessageId) => model('message').findUnique({ where: { platformMessageId } }),
    /** Creates a message. */
    create: (data) => model('message').create({ data }),
  },
  /** Per-account sync runs (Prisma model `syncLog`). */
  syncLogs: {
    /** Lists an account's sync logs, newest `syncedAt` first. `take` defaults to 100. */
    listByAccountId: (accountId, take = 100) => model('syncLog').findMany({
      where: { accountId },
      orderBy: { syncedAt: 'desc' },
      take,
    }),
    /** Creates a sync log. */
    create: (data) => model('syncLog').create({ data }),
  },
  /** Individual sync log entries (Prisma model `syncLogEntry`). */
  syncLogEntries: {
    /** Lists entries for a profile, newest first. `take` defaults to 100. */
    listByProfile: (forProfile, take = 100) => model('syncLogEntry').findMany({
      where: { forProfile },
      orderBy: { createdOn: 'desc' },
      take,
    }),
    /** Creates a sync log entry. */
    create: (data) => model('syncLogEntry').create({ data }),
  },
  /** Uploaded files (Prisma model `upload`). */
  uploads: {
    /** Lists uploads, newest `uploadedOn` first by default. Accepts `searchFilter`, `skip`, `take`, `orderBy`. */
    list: (args = {}) => model('upload').findMany({
      where: args.searchFilter ?? {},
      skip: args.skip,
      take: args.take,
      orderBy: args.orderBy ?? { uploadedOn: 'desc' },
    }),
    /** Counts uploads matching `searchFilter`. */
    count: (args = {}) => model('upload').count({ where: args.searchFilter ?? {} }),
    /** Lists every upload, newest first, with no pagination. */
    listForLibrary: () => model('upload').findMany({ orderBy: { uploadedOn: 'desc' } }),
    /** Gets an upload by ID, or `null`. */
    getById: (id) => model('upload').findUnique(byId(id)),
    /** Creates an upload record. */
    create: (data) => model('upload').create({ data }),
    /** Updates an upload record by ID. */
    update: (id, data) => model('upload').update({ where: { id }, data }),
  },
};

/**
 * Fallback store for repositories that are not implemented.
 *
 * Any method access returns an async function that logs an
 * `unsupported_repository_operation` error (log failures are swallowed) and
 * then throws `Unsupported repository operation: <method>`.
 */
const generic = new Proxy({}, {
  get: (_target, method: string) => async (...args: unknown[]) => {
    const error = new Error(`Unsupported repository operation: ${method}`);

    await logger
      .type('error')
      .data({
        source: 'services/repositories',
        event: 'unsupported_repository_operation',
        operation: method,
        argumentCount: args.length,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      })
      .error()
      .catch(() => undefined);

    throw error;
  },
});

/**
 * Entry point for all repository access, e.g. `dataStore.posts.list(...)`.
 *
 * Returns the matching store from `stores`, or the throwing `generic` proxy
 * if no store has that name. Typed as `any`, so TypeScript will not flag calls
 * to stores or methods that do not exist.
 */
export const dataStore: any = new Proxy({}, { get: (_target, name: string) => stores[name] ?? generic });
