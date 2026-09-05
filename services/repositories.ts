/*
::neup.documentation::services-repositories
::title Prisma-backed service repositories

Provides the existing domain repository operations from the services layer.
This keeps database access behind services and removes the deleted core.v2
data-store dependency.
::end
*/

import { prisma } from '#/core/database/prisma';
import { logger } from '#/logica/logger';

type Delegate = any;
const model = (name: string): Delegate => (prisma as any)[name];
const byId = (id: string) => ({ where: { id } });

const accountWhere = (args: any = {}) => ({
  ...(args.owner ? { owner: args.owner } : {}),
  ...(args.searchFilter ?? (args.search ? {
    OR: ['name', 'username', 'platform'].map((field) => ({ [field]: { contains: args.search, mode: 'insensitive' } })),
  } : {})),
});

const stores: Record<string, Record<string, (...args: any[]) => Promise<any>>> = {
  accounts: {
    list: (args = {}) => model('connectedAccount').findMany({ where: accountWhere(args), skip: args.skip, take: args.take, orderBy: args.orderBy ?? { connectedOn: 'desc' } }),
    count: (args = {}) => model('connectedAccount').count({ where: accountWhere(args) }),
    getById: (id) => model('connectedAccount').findUnique(byId(id)),
    getByIds: (ids) => model('connectedAccount').findMany({ where: { id: { in: ids } } }),
    getWhatsAppAccounts: () => model('connectedAccount').findMany({ where: { platform: 'WhatsApp' } }),
    findByOwnerPlatformId: (owner, platform, platformId) => model('connectedAccount').findFirst({ where: { owner, platform, platformId } }),
    findByPlatformPlatformId: (where) => model('connectedAccount').findFirst({ where }),
    findWhatsAppAccount: (platformId) => model('connectedAccount').findFirst({ where: { platform: 'WhatsApp', platformId } }),
    create: (data) => model('connectedAccount').create({ data }),
    update: (id, data) => model('connectedAccount').update({ where: { id }, data }),
    delete: (id) => model('connectedAccount').delete(byId(id)),
    upsertByOwnerPlatformId: (data) => model('connectedAccount').upsert({ where: { platform_platformId_owner: { platform: data.platform, platformId: data.platformId, owner: data.owner } }, create: data, update: data }),
  },
  localAccounts: {
    list: () => model('account').findMany({ orderBy: { createdOn: 'desc' } }),
    getById: (accountId) => model('account').findUnique({ where: { account_id: accountId } }),
    update: (accountId, data) => model('account').update({ where: { account_id: accountId }, data }),
  },
  posts: {
    list: (args = {}) => model('post').findMany({
      where: {
        ...(args.accountId ? { accountId: args.accountId } : {}),
        ...(args.searchFilter ?? {}),
      },
      skip: args.skip,
      take: args.take,
      orderBy: args.orderBy ?? { createdOn: 'desc' },
    }),
    count: (args = {}) => model('post').count({
      where: {
        ...(args.accountId ? { accountId: args.accountId } : {}),
        ...(args.searchFilter ?? {}),
      },
    }),
    getById: (id) => model('post').findUnique(byId(id)),
    getByIds: (ids) => model('post').findMany({ where: { id: { in: ids } } }),
    findExistingPlatformPostIds: (accountId, platformPostIds) => model('post').findMany({
      where: { accountId, platformPostId: { in: platformPostIds } },
      select: { platformPostId: true },
    }),
    create: (data) => model('post').create({ data }),
    createMany: (data) => model('post').createMany({ data }),
    update: (id, data) => model('post').update({ where: { id }, data }),
    delete: (id) => model('post').delete(byId(id)),
  },
  postCollections: {
    getById: (id) => model('postCollection').findUnique(byId(id)),
    create: (data) => model('postCollection').create({ data }),
    update: (id, data) => model('postCollection').update({ where: { id }, data }),
    appendPosts: (id, postsId) => model('postCollection').update({ where: { id }, data: { postsId: { push: postsId } } }),
    delete: (id) => model('postCollection').delete(byId(id)),
    findByMediaUrl: (filePath) => model('postCollection').findMany({ where: { mediaUrls: { has: filePath } } }),
  },
  spaces: {
    list: () => model('space').findMany({ include: { assets: true }, orderBy: { name: 'asc' } }),
    create: (data) => model('space').create({ data }),
  },
  spaceAssets: {
    replaceForSpace: async (spaceId, assets) => {
      await model('spaceAsset').deleteMany({ where: { spaceId } });
      if (assets.length > 0) {
        await model('spaceAsset').createMany({ data: assets.map((asset) => ({ ...asset, spaceId })) });
      }
    },
  },
  conversations: {
    findByContactAndChannel: (contactId, channelId) => model('conversation').findFirst({ where: { contactId, channelId } }),
    create: (data) => model('conversation').create({ data }),
    update: (id, data) => model('conversation').update({ where: { id }, data }),
  },
  messages: {
    findByPlatformMessageId: (platformMessageId) => model('conversationMessage').findUnique({ where: { platformMessageId } }),
    create: (data) => model('conversationMessage').create({ data }),
  },
};

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

export const dataStore: any = new Proxy({}, { get: (_target, name: string) => stores[name] ?? generic });
