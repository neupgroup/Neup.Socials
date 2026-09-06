'use server';

const FACEBOOK_GRAPH_API_VERSION = 'v25.0';
const FACEBOOK_GRAPH_API_BASE_URL = `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}`;

type CommentToMessageResponse = {
  message_id?: string;
  id?: string;
  error?: {
    message?: string;
  };
};

export type CommentToMessageInput = {
  pageId: string;
  commentId: string;
  pageAccessToken: string;
  text: string;
};

export type CommentToMessageResult = {
  messageId: string;
};

/**
 * Starts a private Messenger conversation from a Facebook Page comment.
 * The Page Access Token must belong to the Page that owns the comment.
 */
export async function sendCommentToMessage({
  pageId,
  commentId,
  pageAccessToken,
  text,
}: CommentToMessageInput): Promise<CommentToMessageResult> {
  const normalizedPageId = pageId.trim();
  const normalizedCommentId = commentId.trim();
  const normalizedText = text.trim();
  const normalizedToken = pageAccessToken.trim();

  if (!normalizedPageId) throw new Error('Facebook Page ID is required.');
  if (!normalizedCommentId) throw new Error('Facebook comment ID is required.');
  if (!normalizedText) throw new Error('Message text is required.');
  if (!normalizedToken) throw new Error('Facebook Page access token is required.');

  const response = await fetch(`${FACEBOOK_GRAPH_API_BASE_URL}/${normalizedPageId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { comment_id: normalizedCommentId },
      message: { text: normalizedText },
      access_token: normalizedToken,
    }),
  });

  const payload = (await response.json().catch(() => null)) as CommentToMessageResponse | null;
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Facebook comment-to-message request failed.');
  }

  const messageId = String(payload?.message_id ?? payload?.id ?? '').trim();
  if (!messageId) {
    throw new Error('Facebook returned no message ID for the comment-to-message request.');
  }

  return { messageId };
}
