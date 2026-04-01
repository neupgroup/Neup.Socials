/**
 * @fileoverview Core functions for Facebook Page conversations/messages.
 */
'use server';

const API_VERSION = 'v25.0';
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

type ErrorResponse = {
  error: {
    message: string;
  };
};

type FacebookConversationResponse = {
  data: Array<{
    id: string;
    updated_time?: string;
    participants?: {
      data?: Array<{
        id: string;
        name: string;
      }>;
    };
    messages?: {
      data?: Array<{
        id: string;
        message?: string;
        created_time?: string;
        from?: {
          id: string;
          name: string;
        };
      }>;
    };
  }>;
};

type SendPageMessageResponse = {
  recipient_id?: string;
  message_id?: string;
};

export type FacebookPageMessageItem = {
  conversationId: string;
  messageId: string;
  text: string;
  createdTime: string;
  senderId: string;
  senderName: string;
};

async function handleApiResponse<T>(res: Response): Promise<T> {
  const json = await res.json();

  if (!res.ok) {
    const error = json as ErrorResponse;
    throw new Error(error.error?.message || 'Facebook API request failed.');
  }

  return json as T;
}

/**
 * Fetches page conversations including recent messages and participant names.
 */
export async function getPageConversationsWithMessages(
  pageId: string,
  pageToken: string,
  options?: {
    conversationLimit?: number;
    messageLimit?: number;
  }
): Promise<FacebookPageMessageItem[]> {
  const conversationLimit = options?.conversationLimit ?? 15;
  const messageLimit = options?.messageLimit ?? 10;

  const params = new URLSearchParams({
    access_token: pageToken,
    limit: String(conversationLimit),
    fields: `id,updated_time,participants.limit(10){id,name},messages.limit(${messageLimit}){id,message,created_time,from}`,
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${pageId}/conversations?${params.toString()}`);
  const payload = await handleApiResponse<FacebookConversationResponse>(res);

  const items: FacebookPageMessageItem[] = [];

  for (const conversation of payload.data ?? []) {
    for (const message of conversation.messages?.data ?? []) {
      if (!message.id || !message.message || !message.from?.id || !message.from?.name) {
        continue;
      }

      // Keep only user-side messages in the inbox stream.
      if (message.from.id === pageId) {
        continue;
      }

      items.push({
        conversationId: conversation.id,
        messageId: message.id,
        text: message.message,
        createdTime: message.created_time ?? conversation.updated_time ?? new Date().toISOString(),
        senderId: message.from.id,
        senderName: message.from.name,
      });
    }
  }

  return items;
}

/**
 * Sends a Messenger text message from a Facebook Page to a recipient PSID.
 */
export async function sendPageTextMessage(
  pageId: string,
  pageToken: string,
  recipientId: string,
  text: string
): Promise<{ messageId: string }> {
  const trimmed = text.trim();
  if (!pageId || !recipientId || !trimmed) {
    throw new Error('Page ID, recipient ID, and message text are required.');
  }

  const params = new URLSearchParams({
    access_token: pageToken,
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${pageId}/messages?${params.toString()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_type: 'RESPONSE',
      recipient: { id: recipientId },
      message: { text: trimmed },
    }),
  });

  const payload = await handleApiResponse<SendPageMessageResponse>(res);
  const messageId = String(payload.message_id ?? '').trim();
  if (!messageId) {
    throw new Error('No message ID returned from Facebook API.');
  }

  return { messageId };
}
