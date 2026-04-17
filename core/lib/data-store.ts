import 'server-only';

import { Prisma } from '@prisma/client';

import { prisma } from '@/core/lib/prisma';

const containsFilter = (value?: string) => {
  if (!value?.trim()) {
    return undefined;
  }

  return {
    contains: value.trim(),
    mode: Prisma.QueryMode.insensitive,
  };
};

const dedupe = (values?: string[] | null) => Array.from(new Set(values?.filter(Boolean) ?? []));

const toJson = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
};

export const dataStore = {
  accounts: {
    list: async ({
      owner,
      search,
      skip = 0,
      take = 10,
    }: {
      owner?: string;
      search?: string;
      skip?: number;
      take?: number;
    }) =>
      prisma.connectedAccount.findMany({
        where: {
          ...(owner ? { owner } : {}),
          ...(search?.trim()
            ? {
                OR: [
                  { name: containsFilter(search) },
                  { username: containsFilter(search) },
                  { platform: containsFilter(search) },
                ],
              }
            : {}),
        },
        orderBy: [{ connectedOn: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
    count: async ({ owner, search }: { owner?: string; search?: string }) =>
      prisma.connectedAccount.count({
        where: {
          ...(owner ? { owner } : {}),
          ...(search?.trim()
            ? {
                OR: [
                  { name: containsFilter(search) },
                  { username: containsFilter(search) },
                  { platform: containsFilter(search) },
                ],
              }
            : {}),
        },
      }),
    getById: async (id: string) => prisma.connectedAccount.findUnique({ where: { id } }),
    getByIds: async (ids: string[]) =>
      prisma.connectedAccount.findMany({
        where: { id: { in: ids } },
      }),
    getWhatsAppAccounts: async () =>
      prisma.connectedAccount.findMany({
        where: { platform: 'WhatsApp' },
        orderBy: [{ connectedOn: 'desc' }, { id: 'desc' }],
      }),
    findByOwnerPlatformId: async ({
      owner,
      platform,
      platformId,
    }: {
      owner: string;
      platform: string;
      platformId: string;
    }) =>
      prisma.connectedAccount.findFirst({
        where: { owner, platform, platformId },
      }),
    findByPlatformPlatformId: async ({
      platform,
      platformId,
    }: {
      platform: string;
      platformId: string;
    }) =>
      prisma.connectedAccount.findMany({
        where: { platform, platformId },
      }),
    upsertByOwnerPlatformId: async ({
      owner,
      platform,
      platformId,
      data,
    }: {
      owner: string;
      platform: string;
      platformId: string;
      data: {
        name?: string | null;
        username?: string | null;
        encryptedToken?: string | null;
        category?: string | null;
        status?: string | null;
        updatedAt?: Date | null;
        lastSyncedAt?: Date | null;
        nameStatus?: string | null;
        metadata?: unknown;
      };
    }) => {
      const existing = await prisma.connectedAccount.findFirst({
        where: { owner, platform, platformId },
      });

      if (existing) {
        return prisma.connectedAccount.update({
          where: { id: existing.id },
          data: {
            platform,
            platformId,
            owner,
            name: data.name,
            username: data.username,
            encryptedToken: data.encryptedToken,
            category: data.category,
            status: data.status,
            updatedAt: data.updatedAt ?? new Date(),
            lastSyncedAt: data.lastSyncedAt ?? null,
            nameStatus: data.nameStatus,
            metadata: toJson(data.metadata),
          },
        });
      }

      return prisma.connectedAccount.create({
        data: {
          platform,
          platformId,
          owner,
          name: data.name,
          username: data.username,
          encryptedToken: data.encryptedToken,
          category: data.category,
          status: data.status,
          connectedOn: new Date(),
          updatedAt: data.updatedAt ?? new Date(),
          lastSyncedAt: data.lastSyncedAt ?? null,
          nameStatus: data.nameStatus,
          metadata: toJson(data.metadata),
        },
      });
    },
    create: async (data: {
      platform: string;
      platformId?: string | null;
      name?: string | null;
      username?: string | null;
      encryptedToken?: string | null;
      category?: string | null;
      status?: string | null;
      owner?: string | null;
      connectedOn?: Date;
      updatedAt?: Date | null;
      lastSyncedAt?: Date | null;
      nameStatus?: string | null;
      metadata?: unknown;
    }) =>
      prisma.connectedAccount.create({
        data: {
          platform: data.platform,
          platformId: data.platformId,
          name: data.name,
          username: data.username,
          encryptedToken: data.encryptedToken,
          category: data.category,
          status: data.status,
          owner: data.owner,
          connectedOn: data.connectedOn ?? new Date(),
          updatedAt: data.updatedAt ?? new Date(),
          lastSyncedAt: data.lastSyncedAt ?? null,
          nameStatus: data.nameStatus,
          metadata: toJson(data.metadata),
        },
      }),
    update: async (
      id: string,
      data: {
        platformId?: string | null;
        name?: string | null;
        username?: string | null;
        encryptedToken?: string | null;
        category?: string | null;
        status?: string | null;
        owner?: string | null;
        updatedAt?: Date | null;
        lastSyncedAt?: Date | null;
        nameStatus?: string | null;
        metadata?: unknown;
      }
    ) =>
      prisma.connectedAccount.update({
        where: { id },
        data: {
          platformId: data.platformId,
          name: data.name,
          username: data.username,
          encryptedToken: data.encryptedToken,
          category: data.category,
          status: data.status,
          owner: data.owner,
          updatedAt: data.updatedAt,
          lastSyncedAt: data.lastSyncedAt,
          nameStatus: data.nameStatus,
          metadata: data.metadata === undefined ? undefined : toJson(data.metadata),
        },
      }),
    delete: async (id: string) => prisma.connectedAccount.delete({ where: { id } }),
    findWhatsAppAccount: async (platformId?: string | null) => {
      if (platformId) {
        const direct = await prisma.connectedAccount.findFirst({
          where: {
            platform: 'WhatsApp',
            platformId,
          },
        });

        if (direct) {
          return direct;
        }
      }

      return prisma.connectedAccount.findFirst({
        where: { platform: 'WhatsApp' },
        orderBy: [{ connectedOn: 'asc' }, { id: 'asc' }],
      });
    },
  },
  posts: {
    list: async ({
      search,
      accountId,
      skip = 0,
      take = 15,
    }: {
      search?: string;
      accountId?: string;
      skip?: number;
      take?: number;
    }) =>
      prisma.post.findMany({
        where: {
          ...(accountId ? { accountId } : {}),
          ...(search?.trim() ? { message: containsFilter(search) } : {}),
        },
        orderBy: [{ createdOn: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
    count: async ({ search, accountId }: { search?: string; accountId?: string }) =>
      prisma.post.count({
        where: {
          ...(accountId ? { accountId } : {}),
          ...(search?.trim() ? { message: containsFilter(search) } : {}),
        },
      }),
    getById: async (id: string) => prisma.post.findUnique({ where: { id } }),
    getByIds: async (ids: string[]) =>
      prisma.post.findMany({
        where: { id: { in: ids } },
      }),
    findExistingPlatformPostIds: async (accountId: string, platformPostIds: string[]) =>
      prisma.post.findMany({
        where: {
          accountId,
          platformPostId: { in: platformPostIds },
        },
        select: {
          platformPostId: true,
        },
      }),
    create: async (data: {
      postCollectionId?: string | null;
      accountId?: string | null;
      platform?: string | null;
      platformPostId?: string | null;
      message?: string | null;
      postLink?: string | null;
      createdBy?: string | null;
      createdOn?: Date;
      analytics?: unknown;
      logs?: string[];
      mediaUrls?: string[];
    }) =>
      prisma.post.create({
        data: {
          postCollectionId: data.postCollectionId,
          accountId: data.accountId,
          platform: data.platform,
          platformPostId: data.platformPostId,
          message: data.message,
          postLink: data.postLink,
          createdBy: data.createdBy,
          createdOn: data.createdOn ?? new Date(),
          analytics: data.analytics === undefined ? undefined : toJson(data.analytics),
          logs: data.logs ?? [],
          mediaUrls: data.mediaUrls ?? [],
        },
      }),
    createMany: async (
      items: Array<{
        postCollectionId?: string | null;
        accountId?: string | null;
        platform?: string | null;
        platformPostId?: string | null;
        message?: string | null;
        postLink?: string | null;
        createdBy?: string | null;
        createdOn?: Date;
        analytics?: unknown;
        logs?: string[];
        mediaUrls?: string[];
      }>
    ) =>
      Promise.all(
        items.map((item) =>
          prisma.post.create({
            data: {
              postCollectionId: item.postCollectionId,
              accountId: item.accountId,
              platform: item.platform,
              platformPostId: item.platformPostId,
              message: item.message,
              postLink: item.postLink,
              createdBy: item.createdBy,
              createdOn: item.createdOn ?? new Date(),
              analytics: item.analytics === undefined ? undefined : toJson(item.analytics),
              logs: item.logs ?? [],
              mediaUrls: item.mediaUrls ?? [],
            },
          })
        )
      ),
    update: async (
      id: string,
      data: {
        postCollectionId?: string | null;
        accountId?: string | null;
        platform?: string | null;
        platformPostId?: string | null;
        message?: string | null;
        postLink?: string | null;
        createdBy?: string | null;
        createdOn?: Date;
        analytics?: unknown;
        logs?: string[];
        mediaUrls?: string[];
      }
    ) =>
      prisma.post.update({
        where: { id },
        data: {
          postCollectionId: data.postCollectionId,
          accountId: data.accountId,
          platform: data.platform,
          platformPostId: data.platformPostId,
          message: data.message,
          postLink: data.postLink,
          createdBy: data.createdBy,
          createdOn: data.createdOn,
          analytics: data.analytics === undefined ? undefined : toJson(data.analytics),
          logs: data.logs,
          mediaUrls: data.mediaUrls,
        },
      }),
    delete: async (id: string) => prisma.post.delete({ where: { id } }),
  },
  postCollections: {
    getById: async (id: string) => prisma.postCollection.findUnique({ where: { id } }),
    create: async (data: {
      content: string;
      mediaUrls?: string[];
      status: string;
      author?: string | null;
      createdAt?: Date;
      postsId?: string[];
      accountIds?: string[];
      platforms?: string[];
      ctaType?: string | null;
      ctaLink?: string | null;
      publishedAt?: Date | null;
      scheduledAt?: Date | null;
      originalPostCollectionId?: string | null;
    }) =>
      prisma.postCollection.create({
        data: {
          content: data.content,
          mediaUrls: data.mediaUrls ?? [],
          status: data.status,
          author: data.author,
          createdAt: data.createdAt ?? new Date(),
          postsId: data.postsId ?? [],
          accountIds: data.accountIds ?? [],
          platforms: data.platforms ?? [],
          ctaType: data.ctaType,
          ctaLink: data.ctaLink,
          publishedAt: data.publishedAt ?? null,
          scheduledAt: data.scheduledAt ?? null,
          originalPostCollectionId: data.originalPostCollectionId,
        },
      }),
    update: async (
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
        publishedAt?: Date | null;
        scheduledAt?: Date | null;
      }
    ) =>
      prisma.postCollection.update({
        where: { id },
        data: {
          content: data.content,
          mediaUrls: data.mediaUrls,
          status: data.status,
          author: data.author,
          postsId: data.postsId,
          accountIds: data.accountIds,
          platforms: data.platforms,
          ctaType: data.ctaType,
          ctaLink: data.ctaLink,
          publishedAt: data.publishedAt,
          scheduledAt: data.scheduledAt,
        },
      }),
    appendPosts: async (id: string, postIds: string[]) => {
      const existing = await prisma.postCollection.findUnique({
        where: { id },
        select: { postsId: true },
      });

      return prisma.postCollection.update({
        where: { id },
        data: {
          postsId: dedupe([...(existing?.postsId ?? []), ...postIds]),
        },
      });
    },
    delete: async (id: string) => prisma.postCollection.delete({ where: { id } }),
    findByMediaUrl: async (filePath: string) =>
      prisma.postCollection.findMany({
        where: {
          mediaUrls: {
            has: filePath,
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
  },
  uploads: {
    list: async ({
      search,
      skip = 0,
      take = 10,
    }: {
      search?: string;
      skip?: number;
      take?: number;
    }) =>
      prisma.upload.findMany({
        where: search?.trim()
          ? {
              OR: [
                { fileName: containsFilter(search) },
                { contentName: containsFilter(search) },
              ],
            }
          : undefined,
        orderBy: [{ uploadedOn: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
    count: async ({ search }: { search?: string }) =>
      prisma.upload.count({
        where: search?.trim()
          ? {
              OR: [
                { fileName: containsFilter(search) },
                { contentName: containsFilter(search) },
              ],
            }
          : undefined,
      }),
    listForLibrary: async () =>
      prisma.upload.findMany({
        orderBy: [{ uploadedOn: 'desc' }, { id: 'desc' }],
      }),
    getById: async (id: string) => prisma.upload.findUnique({ where: { id } }),
    create: async (data: {
      contentName?: string | null;
      fileName: string;
      fileSize: number;
      fileType: string;
      uploadedBy: string;
      filePath: string;
      platform: string;
      contentId: string;
      uploadedOn?: Date;
    }) =>
      prisma.upload.create({
        data: {
          contentName: data.contentName,
          fileName: data.fileName,
          fileSize: data.fileSize,
          fileType: data.fileType,
          uploadedBy: data.uploadedBy,
          filePath: data.filePath,
          platform: data.platform,
          contentId: data.contentId,
          uploadedOn: data.uploadedOn ?? new Date(),
        },
      }),
    update: async (
      id: string,
      data: {
        contentName?: string | null;
      }
    ) =>
      prisma.upload.update({
        where: { id },
        data,
      }),
  },
  errors: {
    list: async () =>
      prisma.errorLog.findMany({
        orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      }),
    getById: async (id: string) => prisma.errorLog.findUnique({ where: { id } }),
    create: async (data: {
      process?: string;
      location?: string;
      errorMessage?: string;
      user?: string;
      context?: unknown;
      timestamp?: Date;
      count?: number;
      source?: string;
      message?: string;
      stack?: string;
      userId?: string;
      request?: unknown;
    }) =>
      prisma.errorLog.create({
        data: {
          process: data.process,
          location: data.location,
          errorMessage: data.errorMessage,
          user: data.user,
          context: data.context === undefined ? undefined : toJson(data.context),
          timestamp: data.timestamp ?? new Date(),
          count: data.count ?? 1,
          source: data.source,
          message: data.message,
          stack: data.stack,
          userId: data.userId,
          request: data.request === undefined ? undefined : toJson(data.request),
        },
      }),
    delete: async (id: string) => prisma.errorLog.delete({ where: { id } }),
    clear: async () => prisma.errorLog.deleteMany(),
  },
  syncLogs: {
    listByAccountId: async (accountId: string) =>
      prisma.syncLog.findMany({
        where: { accountId },
        orderBy: [{ syncedAt: 'desc' }, { id: 'desc' }],
      }),
    create: async (data: {
      accountId: string;
      status: string;
      syncedAt?: Date;
      postsSynced?: number;
      errorMessage?: string;
      range?: unknown;
      details?: unknown;
    }) =>
      prisma.syncLog.create({
        data: {
          accountId: data.accountId,
          status: data.status,
          syncedAt: data.syncedAt ?? new Date(),
          postsSynced: data.postsSynced,
          errorMessage: data.errorMessage,
          range: data.range === undefined ? undefined : toJson(data.range),
          details: data.details === undefined ? undefined : toJson(data.details),
        },
      }),
  },
  syncLogEntries: {
    listByProfile: async ({
      platform,
      forProfile,
      type,
      take = 100,
    }: {
      platform?: string;
      forProfile: string;
      type?: string;
      take?: number;
    }) =>
      prisma.syncLogEntry.findMany({
        where: {
          forProfile,
          ...(platform ? { platform } : {}),
          ...(type ? { type } : {}),
        },
        orderBy: [{ createdOn: 'desc' }, { id: 'desc' }],
        take,
      }),
    create: async (data: {
      type: 'info' | 'posts' | 'comments' | 'messages' | string;
      platform: string;
      forProfile: string;
      sinceTime?: Date | null;
      toTime?: Date | null;
      moreInfo?: unknown;
      createdOn?: Date;
    }) =>
      prisma.syncLogEntry.create({
        data: {
          type: data.type,
          platform: data.platform,
          forProfile: data.forProfile,
          sinceTime: data.sinceTime ?? null,
          toTime: data.toTime ?? null,
          moreInfo: data.moreInfo === undefined ? undefined : toJson(data.moreInfo),
          createdOn: data.createdOn ?? new Date(),
        },
      }),
  },
  spaces: {
    list: async () =>
      prisma.space.findMany({
        include: { assets: true },
        orderBy: [{ id: 'desc' }],
      }),
    getById: async (id: string) =>
      prisma.space.findUnique({
        where: { id },
        include: { assets: true },
      }),
    create: async (data: { name: string }) =>
      prisma.space.create({
        data: {
          name: data.name,
        },
      }),
    update: async (id: string, data: { name?: string }) =>
      prisma.space.update({
        where: { id },
        data: {
          name: data.name,
        },
      }),
    delete: async (id: string) => prisma.space.delete({ where: { id } }),
  },
  spaceAssets: {
    listBySpaceId: async (spaceId: string) =>
      prisma.spaceAsset.findMany({
        where: { spaceId },
        orderBy: [{ id: 'desc' }],
      }),
    replaceForSpace: async (
      spaceId: string,
      assets: Array<{ platform: string; assetId: string }>
    ) => {
      await prisma.$transaction([
        prisma.spaceAsset.deleteMany({ where: { spaceId } }),
        ...assets.map((asset) =>
          prisma.account.upsert({
            where: { account_id: asset.assetId },
            update: {},
            create: { account_id: asset.assetId },
          })
        ),
        ...(assets.length
          ? [
              prisma.spaceAsset.createMany({
                data: assets.map((asset) => ({
                  spaceId,
                  platform: asset.platform,
                  assetId: asset.assetId,
                })),
                skipDuplicates: true,
              }),
            ]
          : []),
      ]);

      return prisma.spaceAsset.findMany({ where: { spaceId } });
    },
  },
  conversations: {
    list: async ({ take = 20 }: { take?: number } = {}) =>
      prisma.conversation.findMany({
        orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
        take,
      }),
    getById: async (id: string) => prisma.conversation.findUnique({ where: { id } }),
    findByContactAndChannel: async (contactId: string, channelId: string) =>
      prisma.conversation.findFirst({
        where: { contactId, channelId },
      }),
    listByChannelIds: async ({
      channelIds,
      take = 200,
    }: {
      channelIds: string[];
      take?: number;
    }) =>
      prisma.conversation.findMany({
        where: {
          channelId: { in: channelIds },
        },
        orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
        take,
      }),
    create: async (data: {
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
          contactId: data.contactId,
          contactName: data.contactName,
          channelId: data.channelId,
          platform: data.platform,
          lastMessage: data.lastMessage,
          lastMessageAt: data.lastMessageAt ?? new Date(),
          unread: data.unread ?? false,
          avatar: data.avatar,
        },
      }),
    update: async (
      id: string,
      data: {
        contactName?: string;
        lastMessage?: string | null;
        lastMessageAt?: Date | null;
        unread?: boolean;
        avatar?: string | null;
      }
    ) =>
      prisma.conversation.update({
        where: { id },
        data,
      }),
  },
  messages: {
    listByConversationId: async (conversationId: string) =>
      prisma.conversationMessage.findMany({
        where: { conversationId },
        orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
      }),
    listByConversationIds: async ({
      conversationIds,
      take = 1000,
    }: {
      conversationIds: string[];
      take?: number;
    }) =>
      prisma.conversationMessage.findMany({
        where: {
          conversationId: { in: conversationIds },
        },
        orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
        take,
      }),
    findByPlatformMessageId: async (platformMessageId: string) =>
      prisma.conversationMessage.findUnique({
        where: { platformMessageId },
      }),
    create: async (data: {
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
      }),
  },
  systemAlerts: {
    create: async (data: {
      type: string;
      platform: string;
      payload?: unknown;
      timestamp?: Date;
    }) =>
      prisma.systemAlert.create({
        data: {
          type: data.type,
          platform: data.platform,
          payload: data.payload === undefined ? undefined : toJson(data.payload),
          timestamp: data.timestamp ?? new Date(),
        },
      }),
  },
  systemConfig: {
    getByKey: async (key: string) =>
      prisma.systemConfig.findUnique({
        where: { key },
      }),
    upsert: async (data: { key: string; value?: string | null }) =>
      prisma.systemConfig.upsert({
        where: { key: data.key },
        create: {
          key: data.key,
          value: data.value ?? null,
        },
        update: {
          value: data.value ?? null,
        },
      }),
  },
  identityUnified: {
    create: async (data: {
      name: string;
      moreInfo?: unknown;
      createdOn?: Date;
    }) =>
      prisma.identityUnified.create({
        data: {
          name: data.name,
          moreInfo: data.moreInfo === undefined ? undefined : toJson(data.moreInfo),
          createdOn: data.createdOn ?? new Date(),
        },
      }),
    update: async (
      id: string,
      data: {
        name?: string;
        moreInfo?: unknown;
      }
    ) =>
      prisma.identityUnified.update({
        where: { id },
        data: {
          name: data.name,
          moreInfo: data.moreInfo === undefined ? undefined : toJson(data.moreInfo),
        },
      }),
  },
  identityPlatform: {
    findByPlatformUserId: async (data: { platform: string; platUserId: string }) =>
      prisma.identityPlatform.findUnique({
        where: {
          platform_platUserId: {
            platform: data.platform,
            platUserId: data.platUserId,
          },
        },
        include: { unified: true },
      }),
    upsertWithUnified: async (data: {
      platform: string;
      platUserId: string;
      name: string;
      moreInfo?: unknown;
    }) => {
      const existing = await prisma.identityPlatform.findUnique({
        where: {
          platform_platUserId: {
            platform: data.platform,
            platUserId: data.platUserId,
          },
        },
        include: { unified: true },
      });

      if (existing) {
        const unified = await prisma.identityUnified.update({
          where: { id: existing.unifiedId },
          data: {
            name: data.name,
            moreInfo: data.moreInfo === undefined ? undefined : toJson(data.moreInfo),
          },
        });

        return {
          ...existing,
          unified,
        };
      }

      const unified = await prisma.identityUnified.create({
        data: {
          name: data.name,
          moreInfo: data.moreInfo === undefined ? undefined : toJson(data.moreInfo),
          createdOn: new Date(),
        },
      });

      return prisma.identityPlatform.create({
        data: {
          platform: data.platform,
          platUserId: data.platUserId,
          unifiedId: unified.id,
        },
        include: { unified: true },
      });
    },
  },
  commentors: {
    findByPlatformProfileAndUser: async (data: {
      platform: string;
      onProfile: string;
      platformUserId: string;
    }) =>
      prisma.commentor.findUnique({
        where: {
          platform_onProfile_platformUserId: {
            platform: data.platform,
            onProfile: data.onProfile,
            platformUserId: data.platformUserId,
          },
        },
      }),
    upsertByPlatformProfileAndUser: async (data: {
      platform: string;
      onProfile: string;
      platformUserId: string;
      name: string;
      firstInteraction?: Date;
    }) =>
      prisma.commentor.upsert({
        where: {
          platform_onProfile_platformUserId: {
            platform: data.platform,
            onProfile: data.onProfile,
            platformUserId: data.platformUserId,
          },
        },
        update: {
          name: data.name,
          firstInteraction: data.firstInteraction,
        },
        create: {
          platform: data.platform,
          onProfile: data.onProfile,
          platformUserId: data.platformUserId,
          name: data.name,
          firstInteraction: data.firstInteraction ?? new Date(),
        },
      }),
    listByPlatformAndProfiles: async ({
      platform,
      onProfiles,
      take = 1000,
    }: {
      platform: string;
      onProfiles: string[];
      take?: number;
    }) =>
      prisma.commentor.findMany({
        where: {
          platform,
          onProfile: { in: onProfiles },
        },
        take,
      }),
  },
  comments: {
    findByPlatformCommentId: async (platformCommentId: string) =>
      prisma.comment.findUnique({
        where: { platformCommentId },
        include: { commentor: true },
      }),
    create: async (data: {
      by: string;
      onProfile: string;
      comment: string;
      on?: Date;
      platform: string;
      platformCommentId?: string | null;
      postId?: string | null;
      postMessage?: string | null;
      permalinkUrl?: string | null;
    }) =>
      prisma.comment.create({
        data: {
          by: data.by,
          onProfile: data.onProfile,
          comment: data.comment,
          on: data.on ?? new Date(),
          platform: data.platform,
          platformCommentId: data.platformCommentId,
          postId: data.postId,
          postMessage: data.postMessage,
          permalinkUrl: data.permalinkUrl,
        },
        include: { commentor: true },
      }),
    listByPlatformAndProfiles: async ({
      platform,
      onProfiles,
      take = 200,
    }: {
      platform: string;
      onProfiles: string[];
      take?: number;
    }) =>
      prisma.comment.findMany({
        where: {
          platform,
          onProfile: { in: onProfiles },
        },
        include: { commentor: true },
        orderBy: [{ on: 'desc' }, { id: 'desc' }],
        take,
      }),
  },
  facebookComments: {
    findExisting: async (data: {
      psid: string;
      comment: string;
      commentedOn: Date;
    }) =>
      prisma.facebookComment.findFirst({
        where: {
          psid: data.psid,
          comment: data.comment,
          commentedOn: data.commentedOn,
        },
      }),
    create: async (data: {
      psid: string;
      comment: string;
      commentedOn?: Date;
      moreInfo?: unknown;
    }) =>
      prisma.facebookComment.create({
        data: {
          psid: data.psid,
          comment: data.comment,
          commentedOn: data.commentedOn ?? new Date(),
          moreInfo: data.moreInfo === undefined ? undefined : toJson(data.moreInfo),
        },
      }),
    listRecent: async ({
      take = 300,
    }: {
      take?: number;
    } = {}) =>
      prisma.facebookComment.findMany({
        orderBy: [{ commentedOn: 'desc' }, { id: 'desc' }],
        take,
      }),
  },
};
