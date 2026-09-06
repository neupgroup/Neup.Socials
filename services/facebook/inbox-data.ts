'use server';

import { Prisma, prisma } from '#/core/database/prisma';

export type FacebookInboxComment = {
  id: string;
  commentId: string;
  postId: string;
  platform: string;
  commentedOn: Date;
  commenter: { id?: string; name?: string; image?: string | null } | null;
  commentText: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const selectCommentFields = Prisma.sql`
  SELECT
    id,
    comment_id AS "commentId",
    post_id AS "postId",
    platform,
    commented_on AS "commentedOn",
    commenter,
    comment_text AS "commentText",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM post_comments
`;

export const getFacebookInboxComment = async (commentId: string) => {
  const rows = await prisma.$queryRaw<FacebookInboxComment[]>(Prisma.sql`${selectCommentFields} WHERE comment_id = ${commentId} LIMIT 1`);
  return rows[0] ?? null;
};

export const listFacebookInboxComments = async ({ since, take = 500 }: { since?: Date; take?: number } = {}) => {
  const sinceClause = since ? Prisma.sql`WHERE platform = 'facebook' AND commented_on >= ${since}` : Prisma.sql`WHERE platform = 'facebook'`;
  return prisma.$queryRaw<FacebookInboxComment[]>(Prisma.sql`${selectCommentFields} ${sinceClause} ORDER BY commented_on DESC, id DESC LIMIT ${take}`);
};

export const listFacebookInboxAccounts = async (take = 200) =>
  prisma.connectedAccount.findMany({ take });

export const getFacebookInboxAccount = async (id: string) =>
  prisma.connectedAccount.findUnique({ where: { id } });

export const getFacebookInboxAccounts = async (ids: string[]) =>
  prisma.connectedAccount.findMany({ where: { id: { in: ids } } });

export const getFacebookInboxPosts = async (ids: string[]) =>
  prisma.post.findMany({ where: { id: { in: ids } } });

export const listFacebookInboxConversations = async (channelIds: string[], take = 400) =>
  prisma.conversation.findMany({
    where: { channelId: { in: channelIds } },
    orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
    take,
  });

export const listFacebookInboxMessages = async (conversationIds: string[], take = 1200) =>
  prisma.conversationMessage.findMany({
    where: { conversationId: { in: conversationIds } },
    orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
    take,
  });
