/*
::neup.documentation::services-repositories
::title Prisma-backed service repositories

Provides the existing domain repository operations from the services layer.
This keeps database access behind services and removes the deleted core.v2
data-store dependency.
::end
*/

import { prisma } from '@/core/database/prisma';

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

const generic = new Proxy({}, { get: (_target, method: string) => async () => { throw new Error(`Unsupported repository operation: ${method}`); } });

export const dataStore: any = new Proxy({}, { get: (_target, name: string) => stores[name] ?? generic });
