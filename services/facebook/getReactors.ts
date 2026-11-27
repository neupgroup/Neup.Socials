/**
 * @fileoverview Server-side helper for retrieving Facebook post
 * reactions without restricting the reaction type.
 *
 * Provides a simplified interface to the shared Facebook
 * reactions retrieval service.
 *
 * @module services/facebook/getReactors
 */

'use server';

import { getAllFacebookReactions } from './reactions.shared';

/**
 * Retrieves reactions associated with a Facebook post without
 * applying an explicit reaction type filter.
 *
 * Delegates reaction retrieval to the shared Facebook reactions service.
 *
 * @param postId - Identifier of the target Facebook post.
 *
 * @returns A promise resolving to the reaction collection
 * returned by the shared Facebook reactions service.
 *
 * @throws Propagates errors encountered during reaction retrieval.
 *
 * @see getAllFacebookReactions
 */
export async function getReactors(postId: string) {
  return getAllFacebookReactions(postId);
}
