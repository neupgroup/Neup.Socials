const INSTAGRAM_GRAPH_API_BASE_URL = 'https://graph.instagram.com/v25.0';

type InstagramApiErrorResponse = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

export type InstagramPrivateReplyResponse = {
  recipient_id?: string;
  message_id?: string;
};

async function handleInstagramApiResponse<T>(res: Response): Promise<T> {
  const raw = await res.text();
  const json = raw ? (JSON.parse(raw) as T | InstagramApiErrorResponse) : ({} as T);

  if (!res.ok) {
    const error = json as InstagramApiErrorResponse;
    throw new Error(error.error?.message || `Instagram API request failed with status ${res.status}.`);
  }

  return json as T;
}

/**
 * Sends a private Instagram DM reply to a user who commented on the app user's
 * professional post, reel, story, or live item.
 *
 * Meta limitation notes:
 * - Only one private reply can be sent per commenter
 * - The reply must be sent within 7 days of the comment
 * - For Instagram Live, replies can only be sent during the live broadcast
 *
 * @see https://developers.facebook.com/docs/instagram-platform/private-replies
 */
export async function sendInstagramPrivateReply(
  instagramAccountId: string,
  accessToken: string,
  commentId: string,
  text: string
): Promise<{ recipientId: string; messageId: string }> {
  const trimmedText = text.trim();

  if (!instagramAccountId || !commentId || !trimmedText) {
    throw new Error('Instagram account ID, comment ID, and message text are required.');
  }

  const res = await fetch(`${INSTAGRAM_GRAPH_API_BASE_URL}/${instagramAccountId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: {
        comment_id: commentId,
      },
      message: {
        text: trimmedText,
      },
    }),
    cache: 'no-store',
  });

  const payload = await handleInstagramApiResponse<InstagramPrivateReplyResponse>(res);
  const recipientId = String(payload.recipient_id ?? '').trim();
  const messageId = String(payload.message_id ?? '').trim();

  if (!recipientId || !messageId) {
    throw new Error('Instagram private reply succeeded but did not return recipient or message IDs.');
  }

  return {
    recipientId,
    messageId,
  };
}
