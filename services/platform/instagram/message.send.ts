'use server';

import { logError } from '@/services/error-logging';

const INSTAGRAM_GRAPH_API_VERSION = 'v23.0';
const INSTAGRAM_GRAPH_API_BASE_URL = `https://graph.instagram.com/${INSTAGRAM_GRAPH_API_VERSION}`;

export type InstagramMessageResponse = {
  recipient_id: string;
  message_id: string;
  statusCode: number;
};

type InstagramMessageErrorResponse = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    fbtrace_id?: string;
  };
};

export async function sendInstagramMessage({
  igUserId,
  recipientId,
  accessToken,
  text,
  replyToMessageId,
}: {
  igUserId: string;
  recipientId: string;
  accessToken: string;
  text: string;
  replyToMessageId?: string;
}): Promise<InstagramMessageResponse> {
  if (!igUserId.trim()) {
    throw new Error('Instagram user ID is required.');
  }

  if (!recipientId.trim()) {
    throw new Error('Instagram recipient ID is required.');
  }

  if (!accessToken.trim()) {
    throw new Error('Instagram access token is required.');
  }

  if (!text.trim()) {
    throw new Error('Instagram message text is required.');
  }

  try {
    const response = await fetch(
      `${INSTAGRAM_GRAPH_API_BASE_URL}/${encodeURIComponent(igUserId)}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: text.trim() },
          ...(replyToMessageId?.trim() ? { reply_to: { message_id: replyToMessageId.trim() } } : {}),
        }),
      },
    );

    const payload = (await response.json().catch(() => null)) as
      | InstagramMessageResponse
      | InstagramMessageErrorResponse
      | null;

    if (!response.ok) {
      const errorMessage =
        (payload as InstagramMessageErrorResponse | null)?.error?.message ||
        'Instagram message request failed.';
      throw new Error(errorMessage);
    }

    if (!payload || !('recipient_id' in payload) || !('message_id' in payload)) {
      throw new Error('Instagram returned an invalid message response.');
    }

    console.log('[Instagram message] sent', {
      igUserId,
      recipientId,
      replyToMessageId: replyToMessageId || null,
      messageId: payload.message_id,
    });

    return { ...payload, statusCode: response.status };
  } catch (error) {
    console.error('[Instagram message] send failed', {
      igUserId,
      recipientId,
      replyToMessageId: replyToMessageId || null,
      error: error instanceof Error ? error.message : String(error),
    });
    await logError({
      process: 'sendInstagramMessage',
      location: 'Instagram Graph API /messages',
      errorMessage: error instanceof Error ? error.message : String(error),
      context: { igUserId, recipientId },
    });
    throw error;
  }
}
