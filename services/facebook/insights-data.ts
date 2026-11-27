/**
 * @fileoverview Server-side database access helpers for Facebook
 * Page insights and connected account retrieval.
 *
 * Provides Prisma-based queries for retrieving connected accounts
 * belonging to a specified owner and resolving individual account records.
 *
 * @see listFacebookInsightsAccounts
 * @see getFacebookInsightsAccount
 *
 * @module services/facebook/insightsData
 */

'use server';

import { prisma } from '@neup/core/database/prisma';

/**
 * Retrieves connected social media accounts belonging to a specified owner.
 *
 * Queries the connected account repository using the supplied owner
 * identifier and applies the configured retrieval limit.
 *
 * @param owner - Identifier of the owner associated with the accounts.
 * @param take - Maximum number of connected account records to retrieve.
 * Defaults to 100.
 *
 * @returns A promise resolving to the matching connected account records.
 *
 * @throws Propagates database query errors.
 *
 * @remarks
 * Despite the Facebook-specific function name, the query does not
 * explicitly restrict accounts to the Facebook platform.
 *
 * Results begin at offset zero and have no explicitly defined ordering.
 * Additional pages are not retrieved automatically.
 */
export const listFacebookInsightsAccounts = async (owner: string, take = 100) =>
  prisma.connectedAccount.findMany({
    where: { owner },
    skip: 0,
    take,
  });

/**
 * Retrieves an individual connected account for insights processing.
 *
 * Looks up the account using its unique internal database identifier.
 *
 * @param id - Internal identifier of the connected account.
 *
 * @returns A promise resolving to the matching connected account,
 * or null when no matching account exists.
 *
 * @throws Propagates database query errors.
 *
 * @remarks
 * This query does not explicitly validate account ownership or
 * restrict the account to the Facebook platform.
 * Platform and credential validation may be performed by the caller.
 */
export const getFacebookInsightsAccount = async (id: string) =>
  prisma.connectedAccount.findUnique({ where: { id } });
