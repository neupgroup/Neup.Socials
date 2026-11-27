/**
 * @fileoverview Shared service for retrieving Facebook post reactions
 * and reaction summaries through the Facebook Graph API.
 *
 * Handles stored post resolution, account credential retrieval,
 * access token decryption, authenticated API requests, reaction
 * filtering, and paginated reaction retrieval.
 *
 * @module services/facebook/reaction.shared
 */

import { dataStore } from '@/services/repositories';
import { decrypt } from '@neup/core/helpers/crypto';

/** Facebook Graph API version used by the shared reactions service. */
export const FACEBOOK_GRAPH_API_VERSION = 'v26.0';

/** Base URL for versioned Facebook Graph API requests. */
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}`;

/**
 * Supported Facebook reaction types within the application.
 *
 * Used to filter reaction collections and retrieve reaction-specific
 * summary counts.
 */
export type FacebookReactionType = 'LIKE' | 'LOVE' | 'WOW' | 'HAHA' | 'SAD' | 'ANGRY';

/**
 * Represents a user returned by the Facebook reactions endpoint.
 */
export type FacebookReaction = {
  /** External identifier of the reacting Facebook user. */
  id: string;

  /** Display name of the reacting user, when available. */
  name?: string;

  /** Profile picture information returned for the reacting user. */
  picture?: { data?: { url?: string } };
};

/**
 * Represents an optional error payload returned by the Facebook Graph API.
 */
type FacebookErrorResponse = { error?: { message?: string } };

/**
 * Resolves the Facebook post identifier and access credentials required
 * to perform Graph API operations on a stored post.
 *
 * Retrieves the post using its internal application identifier,
 * validates its Facebook association, retrieves the connected account,
 * and decrypts its stored access token.
 *
 * @param postId - Internal application identifier of the stored post.
 *
 * @returns A promise resolving to the external Facebook post identifier
 * and decrypted access token.
 *
 * @throws {Error} When the post cannot be found, has no platform post
 * identifier, or does not belong to Facebook.
 * @throws {Error} When the connected account credentials are unavailable.
 * @throws Propagates repository retrieval and token decryption errors.
 *
 * @remarks
 * Platform validation is case-insensitive. Token validity, account
 * ownership, and Graph API permissions are not independently verified.
 */
export async function getFacebookPostContext(postId: string) {
  const post = await dataStore.posts.getById(postId);
  if (!post?.platformPostId || post.platform?.toLowerCase() !== 'facebook') {
    throw new Error('Post not found or not a Facebook post.');
  }

  const account = post.accountId ? await dataStore.accounts.getById(post.accountId) : null;
  if (!account?.encryptedToken) {
    throw new Error('Facebook account credentials were not found.');
  }

  return { platformPostId: post.platformPostId, accessToken: await decrypt(account.encryptedToken) };
}

/**
 * Performs a GET request against the configured Facebook Graph API.
 *
 * Encodes the supplied parameters into a URL query string,
 * retrieves the response, parses its JSON payload, and checks
 * the HTTP response status.
 *
 * @typeParam T - Expected structure of the successful response payload.
 *
 * @param path - Graph API resource path relative to the versioned base URL.
 * @param params - Collection of query parameter names and string values.
 *
 * @returns A promise resolving to the parsed API response cast to
 * the expected response type.
 *
 * @throws {Error} When the Facebook Graph API returns an unsuccessful
 * HTTP response.
 * @throws {SyntaxError} When the response contains invalid JSON.
 * @throws {TypeError} When the underlying network request fails.
 *
 * @remarks
 * Authentication parameters must be supplied by the caller when required.
 *
 * The response is cast to the expected TypeScript type without
 * runtime schema validation.
 *
 * This function does not implement automatic retries or rate-limit handling.
 */
export async function facebookRequest<T>(path: string, params: Record<string, string>) {
  const query = new URLSearchParams(params);
  const response = await fetch(`${GRAPH_API_BASE_URL}${path}?${query.toString()}`);
  const payload = (await response.json()) as T | FacebookErrorResponse;
  if (!response.ok) {
    throw new Error((payload as FacebookErrorResponse).error?.message ?? 'Facebook API request failed.');
  }
  return payload as T;
}

/**
 * Retrieves the paginated reaction collection associated with
 * a stored Facebook post.
 *
 * Resolves the Facebook post context, requests reactor identifiers,
 * names, and profile pictures, and follows pagination links until
 * no subsequent page is available.
 *
 * An optional reaction type can be supplied to restrict the
 * retrieved reaction collection.
 *
 * @param postId - Internal application identifier of the stored post.
 * @param type - Optional Facebook reaction type used to filter results.
 * When omitted, no explicit reaction type filter is applied.
 *
 * @returns A promise resolving to the accumulated collection of
 * Facebook reactions returned across all retrieved pages.
 *
 * @throws Propagates post resolution, credential retrieval,
 * token decryption, network, and API response errors.
 *
 * @remarks
 * The initial request asks for up to 100 reaction records.
 *
 * Subsequent absolute pagination URLs are fetched directly using
 * the URL supplied by the API.
 *
 * Results are accumulated without deduplication, explicit sorting,
 * a maximum page limit, or pagination cycle detection.
 *
 * If a subsequent request fails, the function rejects rather than
 * returning the partially accumulated reaction collection.
 *
 * @see getFacebookPostContext
 * @see facebookRequest
 */
export async function getAllFacebookReactions(
  postId: string,
  type?: FacebookReactionType,
) {
  const { platformPostId, accessToken } = await getFacebookPostContext(postId);
  const reactions: FacebookReaction[] = [];
  let next: string | undefined = `/${platformPostId}/reactions`;
  let params: Record<string, string> = {
    access_token: accessToken,
    fields: 'id,name,picture',
    limit: '100',
  };
  if (type) params.type = type;

  // Continue retrieving reaction pages until no pagination link remains.
  while (next) {
    const payload = next.startsWith('http')
      ? await fetch(next).then(async (response) => {
          const json = await response.json();
          if (!response.ok) throw new Error((json as FacebookErrorResponse).error?.message ?? 'Facebook API request failed.');
          return json as { data?: FacebookReaction[]; paging?: { next?: string } };
        })
      : await facebookRequest<{ data?: FacebookReaction[]; paging?: { next?: string } }>(next, params);

    // Accumulate reactions returned by the current response.
    reactions.push(...(payload.data ?? []));
    next = payload.paging?.next;

    // Subsequent pagination URLs are expected to contain their own parameters.
    params = {};
  }

  return reactions;
}

/**
 * Retrieves the reaction summary associated with a stored Facebook post.
 *
 * Requests the reaction total through Graph API field expansion
 * without requesting individual reaction records.
 *
 * When a reaction type is supplied, the summary request is filtered
 * to that reaction type. Otherwise, the unfiltered reaction summary
 * is requested.
 *
 * @param postId - Internal application identifier of the stored post.
 * @param type - Optional Facebook reaction type used to filter the summary.
 *
 * @returns A promise resolving to the raw reaction summary response,
 * which may contain the total_count property within its reactions summary.
 *
 * @throws Propagates post resolution, credential retrieval,
 * token decryption, network, and API response errors.
 *
 * @remarks
 * Missing reaction summaries and counts are not normalized by
 * this function. Callers are responsible for applying fallback values.
 *
 * The limit(0) field modifier requests summary information without
 * retrieving individual reaction records.
 *
 * @see getFacebookPostContext
 * @see facebookRequest
 */
export async function getFacebookReactionSummary(postId: string, type?: FacebookReactionType) {
  const { platformPostId, accessToken } = await getFacebookPostContext(postId);
  const reactionField = type ? `reactions.type(${type}).limit(0).summary(true)` : 'reactions.limit(0).summary(true)';
  return facebookRequest<{ reactions?: { summary?: { total_count?: number } } }>(`/${platformPostId}`, {
    access_token: accessToken,
    fields: reactionField,
  });
}
