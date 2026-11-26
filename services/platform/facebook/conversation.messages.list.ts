'use server';

import { logFacebookApiError, FACEBOOK_GRAPH_API_BASE_URL, getFacebookApi } from './api';

/** A participant (user or Page) in a Facebook message or conversation. */
export type FacebookMessageParticipant = { id: string; name?: string };

/** A single message within a Facebook conversation. */
export type FacebookConversationMessage = {
  /** Message id. */
  id: string;
  /** Message text, if any. */
  message?: string;
  /** ISO timestamp of when the message was created. */
  created_time?: string;
  /** Sender of the message. */
  from?: FacebookMessageParticipant;
  /** Recipients of the message. */
  to?: { data?: FacebookMessageParticipant[] };
  /** Raw attachment objects, if any. */
  attachments?: { data?: Array<Record<string, unknown>> };
};

/** Response for a conversation including its participants and paged messages. */
export type FacebookConversationMessagesResponse = {
  /** Conversation id. */
  id: string;
  /** Participants in the conversation. */
  participants?: { data?: FacebookMessageParticipant[] };
  /** Messages in the conversation, with paging links. */
  messages?: { data?: FacebookConversationMessage[]; paging?: { next?: string; previous?: string } };
};

/**
 * Fetches the messages of a single Facebook Page conversation from the Graph API.
 *
 * Requests the fields `id`, `participants` and
 * `messages{message,from,to,created_time,attachments}`. Pagination can be
 * continued using the `after` / `before` cursors. Failures are logged via
 * `logFacebookApiError` and then rethrown.
 *
 * @param params - Request options.
 * @param params.conversationId - Facebook conversation id. Must not be blank.
 * @param params.accessToken - Page access token. Must not be blank.
 * @param params.after - Optional cursor to fetch messages after.
 * @param params.before - Optional cursor to fetch messages before.
 * @returns A promise resolving to the conversation with its messages.
 * @throws {Error} If `conversationId` or `accessToken` is blank, or if the API request fails.
 */
export async function getFacebookConversationMessages({ conversationId, accessToken, after, before }: {
  conversationId: string;
  accessToken: string;
  after?: string;
  before?: string;
}): Promise<FacebookConversationMessagesResponse> {
  if (!conversationId.trim()) throw new Error('Facebook conversation ID is required.');
  if (!accessToken.trim()) throw new Error('Facebook Page access token is required.');

  const fields = 'id,participants,messages{message,from,to,created_time,attachments}';
  try {
    const params = new URLSearchParams({ fields });
    if (after?.trim()) params.set('after', after.trim());
    if (before?.trim()) params.set('before', before.trim());
    return await getFacebookApi<FacebookConversationMessagesResponse>(
      `${FACEBOOK_GRAPH_API_BASE_URL}/${encodeURIComponent(conversationId)}?${params.toString()}`,
      accessToken,
    );
  } catch (error) {
    await logFacebookApiError('getFacebookConversationMessages', 'Facebook Graph API /conversation', error, { conversationId });
    throw error;
  }
}
