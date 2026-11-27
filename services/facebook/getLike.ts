/**
 * @fileoverview Server-side helper for retrieving the reaction count
 * associated with a Facebook post.
 *
 * Delegates reaction summary retrieval to the shared Facebook
 * reactions service.
 *
 * @module services/facebook/getLike
 */

'use server';

import { getFacebookReactionSummary } from './reactions.shared';

/**
 * Retrieves the total reaction count for a Facebook post.
 *
 * Requests the reaction summary without specifying a reaction type
 * and extracts the total count from the returned summary.
 *
 * @param postId - Identifier of the target Facebook post.
 *
 * @returns A promise resolving to the total reaction count.
 * Returns 0 when the reaction summary or total count is unavailable.
 *
 * @throws Propagates errors encountered by the shared reaction
 * summary service.
 *
 * @remarks
 * Despite its name, this function does not explicitly filter
 * reactions by the LIKE reaction type.
 *
 * @see getFacebookReactionSummary
 */
export async function getLike(postId: string) {
  const response = await getFacebookReactionSummary(postId);
  return response.reactions?.summary?.total_count ?? 0;
}
