'use server';

import { logError } from '@/services/error-logging';

const INSTAGRAM_GRAPH_API_VERSION = 'v23.0';
const INSTAGRAM_GRAPH_API_BASE_URL = `https://graph.instagram.com/${INSTAGRAM_GRAPH_API_VERSION}`;

export type InstagramMessageParticipant = {
  id: string;
  username?: string;
};

export type InstagramConversationMessage = {
  id: string;
  message?: string;
  created_time?: string;
  from?: InstagramMessageParticipant;
  to?: { data: InstagramMessageParticipant[] };
  attachments?: {
    data?: Array<{
      type?: string;
      url?: string;
      media_url?: string;
      thumbnail_url?: string;
      title?: string;
    }>;
  };
  reply_to?: { id: string; message?: string };
};

export type InstagramConversationMessagesResponse = {
  id: string;
  messages?: {
    data: InstagramConversationMessage[];
    paging?: { next?: string; previous?: string };
  };
};

type InstagramApiError = { error?: { message?: string } };

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
    const fields = 'messages{id,from,to,created_time,message,attachments,reply_to}';
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

export async function getInstagramMessage({
  messageId,
  accessToken,
}: {
  messageId: string;
  accessToken: string;
}): Promise<InstagramConversationMessage> {
  if (!messageId.trim()) throw new Error('Instagram message ID is required.');
  if (!accessToken.trim()) throw new Error('Instagram access token is required.');

  const fields = 'id,message,from,to,created_time';
  const url = `${INSTAGRAM_GRAPH_API_BASE_URL}/${encodeURIComponent(messageId)}?fields=${encodeURIComponent(fields)}`;
  const response = await getInstagramApi<InstagramConversationMessage>(url, accessToken);
  console.log('[Instagram message] response', { messageId, response });
  return response;
}
