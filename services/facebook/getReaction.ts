/**
 * @fileoverview Server-side helper for retrieving reaction counts
 * filtered by a specific Facebook reaction type.
 *
 * Uses the shared Facebook reactions service to obtain reaction
 * summaries and extract their total counts.
 *
 * @module services/facebook/getReactions
 */

'use server';

import { FacebookReactionType, getFacebookReactionSummary } from './reactions.shared';

/**
 * Retrieves the total count of a specific reaction type
 * associated with a Facebook post.
 *
 * Requests a filtered reaction summary using the supplied
 * Facebook reaction type.
 *
 * @param postId - Identifier of the target Facebook post.
 * @param type - Facebook reaction type used to filter the summary.
 *
 * @returns A promise resolving to the total count of the specified
 * reaction type. Returns 0 when the reaction summary or total
 * count is unavailable.
 *
 * @throws Propagates errors encountered by the shared reaction
 * summary service.
 *
 * @see FacebookReactionType
 * @see getFacebookReactionSummary
 */
export async function getReaction(postId: string, type: FacebookReactionType) {
  const response = await getFacebookReactionSummary(postId, type);
  return response.reactions?.summary?.total_count ?? 0;
}
