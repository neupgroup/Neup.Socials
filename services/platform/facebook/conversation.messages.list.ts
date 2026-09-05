'use server';

import { logFacebookApiError, FACEBOOK_GRAPH_API_BASE_URL, getFacebookApi } from './api';

export type FacebookMessageParticipant = { id: string; name?: string };
export type FacebookConversationMessage = {
  id: string;
  message?: string;
  created_time?: string;
  from?: FacebookMessageParticipant;
  to?: { data?: FacebookMessageParticipant[] };
  attachments?: { data?: Array<Record<string, unknown>> };
};
export type FacebookConversationMessagesResponse = {
  id: string;
  participants?: { data?: FacebookMessageParticipant[] };
  messages?: { data?: FacebookConversationMessage[]; paging?: { next?: string; previous?: string } };
};

export async function getFacebookConversationMessages({ conversationId, accessToken }: {
  conversationId: string;
  accessToken: string;
}): Promise<FacebookConversationMessagesResponse> {
  if (!conversationId.trim()) throw new Error('Facebook conversation ID is required.');
  if (!accessToken.trim()) throw new Error('Facebook Page access token is required.');

  const fields = 'id,participants,messages{message,from,to,created_time,attachments}';
  try {
    return await getFacebookApi<FacebookConversationMessagesResponse>(
      `${FACEBOOK_GRAPH_API_BASE_URL}/${encodeURIComponent(conversationId)}?fields=${encodeURIComponent(fields)}`,
      accessToken,
    );
  } catch (error) {
    await logFacebookApiError('getFacebookConversationMessages', 'Facebook Graph API /conversation', error, { conversationId });
    throw error;
  }
}
