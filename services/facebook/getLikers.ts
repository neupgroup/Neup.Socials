/**
 * @fileoverview Server-side helper for retrieving Facebook users
 * who have reacted to a post with the LIKE reaction type.
 *
 * Delegates reaction retrieval to the shared Facebook reactions service.
 *
 * @module services/facebook/getLikers
 */

'use server';

import { getAllFacebookReactions } from './reactions.shared';

/**
 * Retrieves reactions of type LIKE associated with a Facebook post.
 *
 * Delegates retrieval to the shared reaction service with an
 * explicit LIKE reaction filter.
 *
 * @param postId - Identifier of the target Facebook post.
 *
 * @returns A promise resolving to the LIKE reaction collection
 * returned by the shared Facebook reactions service.
 *
 * @throws Propagates errors encountered during reaction retrieval.
 *
 * @remarks
 * Reactions of other types are excluded through the supplied
 * LIKE reaction filter.
 *
 * @see getAllFacebookReactions
 */
export async function getLikers(postId: string) {
  return getAllFacebookReactions(postId, 'LIKE');
}
