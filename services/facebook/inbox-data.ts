/**
 * @fileoverview Server-side database access helpers for the
 * Facebook inbox and conversation management features.
 *
 * Provides retrieval operations for stored comments, connected
 * social accounts, posts, conversations, and messages.
 *
 * Uses Prisma ORM and parameterized SQL queries to access
 * persisted application data.
 *
 * @module services/facebook/inboxData
 */

'use server';

import { Prisma, prisma } from '@neup/core/database/prisma';

/**
 * Represents a stored comment record used by the Facebook inbox.
 *
 * Maps database comment fields into the application's
 * camelCase data structure.
 */
export type FacebookInboxComment = {
  /** Internal database identifier of the comment record. */
  id: string;

  /** External platform identifier of the comment. */
  commentId: string;

  /** Internal identifier of the associated post. */
  postId: string;

  /** Social media platform associated with the comment. */
  platform: string;

  /** Timestamp indicating when the comment was published. */
  commentedOn: Date;

  /** Stored identity and profile information of the comment author. */
  commenter: { id?: string; name?: string; image?: string | null } | null;

  /** Text content of the comment, when available. */
  commentText: string | null;

  /** Timestamp indicating when the database record was created. */
  createdAt: Date;

  /** Timestamp indicating when the database record was last updated. */
  updatedAt: Date;
};

/**
 * Reusable SQL fragment for retrieving stored post comments.
 *
 * Selects the fields required by the inbox and aliases
 * snake_case database columns to camelCase application properties.
 *
 * Additional filtering, ordering, and limiting clauses are
 * supplied by the individual retrieval functions.
 */
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

/**
 * Retrieves a stored inbox comment using its external comment identifier.
 *
 * Executes a parameterized SQL query against the post_comments table,
 * limiting the result to a single matching record.
 *
 * @param commentId - External platform identifier of the comment.
 *
 * @returns A promise resolving to the first matching comment record,
 * or null when no matching record exists.
 *
 * @throws Propagates database query errors.
 *
 * @remarks
 * This query filters by comment identifier only and does not
 * explicitly restrict the platform to Facebook.
 */
export const getFacebookInboxComment = async (commentId: string) => {
  const rows = await prisma.$queryRaw<FacebookInboxComment[]>(Prisma.sql`${selectCommentFields} WHERE comment_id = ${commentId} LIMIT 1`);
  return rows[0] ?? null;
};

/**
 * Retrieves a collection of stored Facebook inbox comments.
 *
 * Restricts results to Facebook comments and optionally filters
 * records by their original publication timestamp.
 *
 * Results are ordered by comment publication time in descending
 * order, with the internal identifier used as a secondary sort field.
 *
 * @param options - Optional comment retrieval configuration.
 * @param options.since - Inclusive lower bound for comment publication time.
 * When omitted, no timestamp filter is applied.
 * @param options.take - Maximum number of records to retrieve.
 * Defaults to 500.
 *
 * @returns A promise resolving to the matching Facebook comment records.
 *
 * @throws Propagates database query errors.
 */
export const listFacebookInboxComments = async ({ since, take = 500 }: { since?: Date; take?: number } = {}) => {
  const sinceClause = since ? Prisma.sql`WHERE platform = 'facebook' AND commented_on >= ${since}` : Prisma.sql`WHERE platform = 'facebook'`;
  return prisma.$queryRaw<FacebookInboxComment[]>(Prisma.sql`${selectCommentFields} ${sinceClause} ORDER BY commented_on DESC, id DESC LIMIT ${take}`);
};

/**
 * Retrieves connected social media accounts for inbox processing.
 *
 * @param take - Maximum number of account records to retrieve.
 * Defaults to 200.
 *
 * @returns A promise resolving to the retrieved connected accounts.
 *
 * @throws Propagates database query errors.
 *
 * @remarks
 * This query does not explicitly restrict accounts to Facebook
 * or apply a specific ordering to the results.
 */
export const listFacebookInboxAccounts = async (take = 200) =>
  prisma.connectedAccount.findMany({ take });

/**
 * Retrieves a single connected social media account.
 *
 * @param id - Internal database identifier of the connected account.
 *
 * @returns A promise resolving to the matching account,
 * or null when the account does not exist.
 *
 * @throws Propagates database query errors.
 *
 * @remarks
 * Account retrieval is based solely on the supplied identifier.
 */
export const getFacebookInboxAccount = async (id: string) =>
  prisma.connectedAccount.findUnique({ where: { id } });

/**
 * Retrieves multiple connected social media accounts by their
 * internal database identifiers.
 *
 * @param ids - Collection of connected account identifiers.
 *
 * @returns A promise resolving to the matching account records.
 *
 * @throws Propagates database query errors.
 *
 * @remarks
 * Results are not guaranteed to follow the order of the supplied
 * identifiers. No explicit platform filter is applied.
 */
export const getFacebookInboxAccounts = async (ids: string[]) =>
  prisma.connectedAccount.findMany({ where: { id: { in: ids } } });

/**
 * Retrieves stored posts associated with the supplied
 * internal post identifiers.
 *
 * Used to resolve post information related to inbox comments
 * and other inbox records.
 *
 * @param ids - Collection of internal application post identifiers.
 *
 * @returns A promise resolving to the matching post records.
 *
 * @throws Propagates database query errors.
 *
 * @remarks
 * The query does not explicitly filter posts by platform or
 * guarantee the order of returned records.
 */
export const getFacebookInboxPosts = async (ids: string[]) =>
  prisma.post.findMany({ where: { id: { in: ids } } });

/**
 * Retrieves stored conversations associated with the supplied channels.
 *
 * Conversations are ordered by their latest message timestamp
 * in descending order, followed by their internal identifier
 * in descending order.
 *
 * @param channelIds - Collection of channel identifiers used to
 * filter conversations.
 * @param take - Maximum total number of conversations to retrieve.
 * Defaults to 400.
 *
 * @returns A promise resolving to the matching conversation records.
 *
 * @throws Propagates database query errors.
 *
 * @remarks
 * The retrieval limit applies across all supplied channels,
 * rather than independently to each channel.
 */
export const listFacebookInboxConversations = async (channelIds: string[], take = 400) =>
  prisma.conversation.findMany({
    where: { channelId: { in: channelIds } },
    orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
    take,
  });

/**
 * Retrieves stored messages associated with the supplied conversations.
 *
 * Messages are ordered by their message timestamp in descending order,
 * followed by their internal identifier in descending order.
 *
 * @param conversationIds - Collection of conversation identifiers
 * used to filter messages.
 * @param take - Maximum total number of messages to retrieve.
 * Defaults to 1200.
 *
 * @returns A promise resolving to the matching message records.
 *
 * @throws Propagates database query errors.
 *
 * @remarks
 * The retrieval limit applies across all supplied conversations,
 * rather than independently to each conversation.
 *
 * Messages are returned from newest to oldest according to
 * the configured ordering.
 */
export const listFacebookInboxMessages = async (conversationIds: string[], take = 1200) =>
  prisma.message.findMany({
    where: { conversationId: { in: conversationIds } },
    orderBy: [{ messageTime: 'desc' }, { id: 'desc' }],
    take,
  });
  