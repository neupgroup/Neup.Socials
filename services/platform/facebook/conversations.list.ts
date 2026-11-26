'use server';

import { logFacebookApiError, FACEBOOK_GRAPH_API_BASE_URL, getFacebookApi } from './api';

/** A participant in a Facebook Page conversation. */
export type FacebookConversationParticipant = { id: string; name?: string };

/** Summary of a Facebook Page conversation. */
export type FacebookConversation = {
  /** Conversation id. */
  id: string;
  /** ISO timestamp of the last update. */
  updated_time?: string;
  /** Participants in the conversation. */
  participants?: { data?: FacebookConversationParticipant[] };
  /** Preview text of the latest message. */
  snippet?: string;
};

/** Paged response for a Page's conversations. */
export type FacebookConversationsResponse = {
  data: FacebookConversation[];
  paging?: { cursors?: { before?: string; after?: string }; next?: string; previous?: string };
};

/**
 * Fetches a page of conversations for a Facebook Page from the Graph API.
 *
 * Requests the fields `id`, `updated_time`, `participants` and `snippet`. The
 * `after` cursor and `limit` are optional; `limit` is only sent when it is a
 * positive integer. The response is validated to ensure `data` is an array.
 * Failures are logged via `logFacebookApiError` and then rethrown.
 *
 * @param params - Request options.
 * @param params.pageId - Facebook Page id. Must not be blank.
 * @param params.accessToken - Page access token. Must not be blank.
 * @param params.after - Optional cursor to continue pagination.
 * @param params.limit - Optional maximum number of conversations to return.
 * @returns A promise resolving to the conversations and paging info.
 * @throws {Error} If `pageId` or `accessToken` is blank, if the API request fails,
 *   or if the response is not in the expected format.
 */
export async function getFacebookConversations({ pageId, accessToken, after, limit }: {
  pageId: string;
  accessToken: string;
  after?: string;
  limit?: number;
}): Promise<FacebookConversationsResponse> {
  if (!pageId.trim()) throw new Error('Facebook Page ID is required.');
  if (!accessToken.trim()) throw new Error('Facebook Page access token is required.');

  const params = new URLSearchParams({ fields: 'id,updated_time,participants,snippet' });
  if (after?.trim()) params.set('after', after.trim());
  if (limit !== undefined && Number.isInteger(limit) && limit > 0) params.set('limit', String(limit));

  try {
    const response = await getFacebookApi<FacebookConversationsResponse>(
      `${FACEBOOK_GRAPH_API_BASE_URL}/${encodeURIComponent(pageId)}/conversations?${params}`,
      accessToken,
    );
    if (!response || !Array.isArray(response.data)) throw new Error('Facebook returned an invalid conversations response.');
    return response;
  } catch (error) {
    await logFacebookApiError('getFacebookConversations', 'Facebook Graph API /conversations', error, { pageId });
    throw error;
  }
}
