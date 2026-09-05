'use server';

import { logFacebookApiError, FACEBOOK_GRAPH_API_BASE_URL, getFacebookApi } from './api';

export type FacebookConversationParticipant = { id: string; name?: string };
export type FacebookConversation = {
  id: string;
  updated_time?: string;
  participants?: { data?: FacebookConversationParticipant[] };
  snippet?: string;
};
export type FacebookConversationsResponse = {
  data: FacebookConversation[];
  paging?: { cursors?: { before?: string; after?: string }; next?: string; previous?: string };
};

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
