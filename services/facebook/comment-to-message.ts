/**
 * @fileoverview Server-side service for sending private Messenger messages
 * in response to Facebook Page comments.
 *
 * Provides input validation, Graph API communication, response handling,
 * and message identifier extraction.
 *
 * @module services/facebook/comment-to-message
 */

'use server';

/** Facebook Graph API version used for comment-to-message requests. */
const FACEBOOK_GRAPH_API_VERSION = 'v25.0';

/** Base URL for Facebook Graph API requests. */
const FACEBOOK_GRAPH_API_BASE_URL = `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}`;

/**
 * Represents the raw Facebook Graph API response for a
 * comment-to-message request.
 */
type CommentToMessageResponse = {
  /** Identifier of the successfully sent message. */
  message_id?: string;

  /** Alternative identifier returned by the API. */
  id?: string;

  /** Error information returned when the request fails. */
  error?: {
    /** Human-readable API error message. */
    message?: string;
  };
};

/**
 * Input required to send a private Messenger message
 * in response to a Facebook Page comment.
 */
export type CommentToMessageInput = {
  /** Identifier of the Facebook Page that owns the comment. */
  pageId: string;

  /** Identifier of the Facebook comment being responded to. */
  commentId: string;

  /** Access token belonging to the Facebook Page. */
  pageAccessToken: string;

  /** Text content of the private message. */
  text: string;
};

/**
 * Represents the result of a successful comment-to-message request.
 */
export type CommentToMessageResult = {
  /** Identifier of the message returned by Facebook. */
  messageId: string;
};

/**
 * Sends a private Messenger message in response to a Facebook Page comment.
 *
 * Normalizes and validates the provided input before submitting a request
 * to the Facebook Graph API messaging endpoint.
 *
 * The Page Access Token must belong to the Page that owns the comment.
 *
 * @param input - Information required to send the private message.
 * @param input.pageId - Identifier of the Facebook Page.
 * @param input.commentId - Identifier of the target Facebook comment.
 * @param input.pageAccessToken - Access token of the owning Facebook Page.
 * @param input.text - Text content of the message to send.
 *
 * @returns A promise resolving to the identifier of the sent message.
 *
 * @throws {Error} When any required input is empty after normalization.
 * @throws {Error} When the Facebook Graph API request is unsuccessful.
 * @throws {Error} When Facebook returns no valid message identifier.
 * @throws {TypeError} When the underlying network request fails.
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

  // Parse the response safely, allowing non-JSON responses to fall back to null.
  const payload = (await response.json().catch(() => null)) as CommentToMessageResponse | null;
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Facebook comment-to-message request failed.');
  }

  // Support both message identifier fields returned by the API.
  const messageId = String(payload?.message_id ?? payload?.id ?? '').trim();
  if (!messageId) {
    throw new Error('Facebook returned no message ID for the comment-to-message request.');
  }

  return { messageId };
}
