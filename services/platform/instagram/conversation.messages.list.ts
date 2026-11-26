'use server';

import { logError } from '@/services/error-logging';

const INSTAGRAM_GRAPH_API_VERSION = 'v23.0';
const INSTAGRAM_GRAPH_API_BASE_URL = `https://graph.instagram.com/${INSTAGRAM_GRAPH_API_VERSION}`;

/** Minimal participant (sender or recipient) of an Instagram message. */
export type InstagramMessageParticipant = {
  id: string;
  username?: string;
};

/** A single message as returned by the Instagram Graph API. */
export type InstagramConversationMessage = {
  id: string;
  message?: string;
  created_time?: string;
  from?: InstagramMessageParticipant;
  to?: { data: InstagramMessageParticipant[] };
  attachments?: {
    data?: Array<{
      id?: string;
      type?: string;
      payload?: Record<string, unknown>;
      url?: string;
      media_url?: string;
      thumbnail_url?: string;
      title?: string;
      [key: string]: unknown;
    }>;
  };
  reply_to?: { id: string; message?: string };
};


/** Response of the conversation endpoint when expanding `messages`. */
export type InstagramConversationMessagesResponse = {
  id: string;
  messages?: {
    data: InstagramConversationMessage[];
    paging?: { next?: string; previous?: string };
  };
};

type InstagramApiError = { error?: { message?: string } };

/**
 * Performs an authenticated GET request against the Instagram Graph API.
 * @template T - Expected shape of a successful JSON response.
 * @param {string} url - Fully qualified request URL.
 * @param {string} accessToken - Instagram access token, sent as a Bearer token.
 * @returns {Promise<T>} The parsed JSON payload.
 * @throws {Error} If the response is not OK. Uses the API's `error.message` when
 *   available, otherwise `'Instagram message request failed.'`.
 */
async function getInstagramApi<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = (await response.json().catch(() => null)) as T | InstagramApiError | null;

  if (!response.ok) {
    throw new Error((payload as InstagramApiError | null)?.error?.message || 'Instagram message request failed.');
  }

  return payload as T;
}

/**
 * Fetches the messages of an Instagram conversation, including sender, recipient,
 * text, timestamp, attachments and reply reference.
 *
 * Failures are logged to the console and to `logError`, then re-thrown.
 *
 * @param {Object} params
 * @param {string} params.conversationId - Instagram conversation (thread) ID.
 * @param {string} params.accessToken - Instagram access token.
 * @param {string} [params.after] - Pagination cursor for the next page.
 * @returns {Promise<InstagramConversationMessagesResponse>} The conversation with its page of messages and paging info.
 * @throws {Error} If `conversationId` or `accessToken` is empty, or the API request fails.
 */
export async function getInstagramConversationMessages({
  conversationId,
  accessToken,
  after,
}: {
  conversationId: string;
  accessToken: string;
  after?: string;
}): Promise<InstagramConversationMessagesResponse> {
  if (!conversationId.trim()) throw new Error('Instagram conversation ID is required.');
  if (!accessToken.trim()) throw new Error('Instagram access token is required.');

  try {
    const fields = 'id,messages{id,from,to,created_time,message,attachments{type,payload},reply_to}';
    const params = new URLSearchParams({ fields });
    if (after?.trim()) params.set('after', after.trim());
    const url = `${INSTAGRAM_GRAPH_API_BASE_URL}/${encodeURIComponent(conversationId)}?${params.toString()}`;
    const response = await getInstagramApi<InstagramConversationMessagesResponse>(url, accessToken);
    console.log('[Instagram conversation messages] response', { conversationId, response });
    return response;
  } catch (error) {
    console.error('[Instagram conversation messages] error', {
      conversationId,
      error: error instanceof Error ? error.message : String(error),
    });
    await logError({
      process: 'getInstagramConversationMessages',
      location: 'Instagram Graph API /conversation messages',
      errorMessage: error instanceof Error ? error.message : String(error),
      context: { conversationId },
    });
    throw error;
  }
}

/**
 * Fetches a single Instagram message by ID, including its attachments.
 * @param {Object} params
 * @param {string} params.messageId - Instagram message ID.
 * @param {string} params.accessToken - Instagram access token.
 * @returns {Promise<InstagramConversationMessage>} The requested message.
 * @throws {Error} If `messageId` or `accessToken` is empty, or the API request fails.
 */
export async function getInstagramMessage({
  messageId,
  accessToken,
}: {
  messageId: string;
  accessToken: string;
}): Promise<InstagramConversationMessage> {
  if (!messageId.trim()) throw new Error('Instagram message ID is required.');
  if (!accessToken.trim()) throw new Error('Instagram access token is required.');

  const fields = 'id,message,from,to,created_time,attachments{type,payload}';
  const url = `${INSTAGRAM_GRAPH_API_BASE_URL}/${encodeURIComponent(messageId)}?fields=${encodeURIComponent(fields)}`;
  const response = await getInstagramApi<InstagramConversationMessage>(url, accessToken);
  console.log('[Instagram message] response', { messageId, response });
  return response;
}
