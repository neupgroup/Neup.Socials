'use server';

import { logFacebookApiError, FACEBOOK_GRAPH_API_BASE_URL, getFacebookApi } from './api';

/** Result of sending a message via the Graph API, plus the HTTP status code. */
export type FacebookMessageResponse = {
  /** Page-scoped id (PSID) of the recipient. */
  recipient_id: string;
  /** Id of the sent message. */
  message_id: string;
  /** HTTP status code of the response. */
  statusCode: number;
};

/**
 * Sends a text message from a Facebook Page to a user via the Graph API
 * (`POST /me/messages`).
 *
 * Inputs are trimmed before sending. The response is validated to contain
 * `recipient_id` and `message_id`, and the HTTP status is added as `statusCode`.
 * Failures are logged via `logFacebookApiError` and then rethrown.
 *
 * @param params - Message options.
 * @param params.recipientId - Recipient's page-scoped id (PSID). Must not be blank.
 * @param params.accessToken - Page access token. Must not be blank.
 * @param params.text - Message text. Must not be blank.
 * @returns A promise resolving to the recipient id, message id and status code.
 * @throws {Error} If any input is blank, if the request fails (using Facebook's
 *   error message when available), or if the response is not in the expected format.
 */
export async function sendFacebookMessage({ recipientId, accessToken, text }: {
  recipientId: string;
  accessToken: string;
  text: string;
}): Promise<FacebookMessageResponse> {
  if (!recipientId.trim()) throw new Error('Facebook recipient PSID is required.');
  if (!accessToken.trim()) throw new Error('Facebook Page access token is required.');
  if (!text.trim()) throw new Error('Facebook message text is required.');

  try {
    const response = await fetch(`${FACEBOOK_GRAPH_API_BASE_URL}/me/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: recipientId.trim() }, message: { text: text.trim() } }),
    });
    const payload = await response.json().catch(() => null) as FacebookMessageResponse | { error?: { message?: string } } | null;
    if (!response.ok) throw new Error((payload as { error?: { message?: string } } | null)?.error?.message || 'Facebook message request failed.');
    if (!payload || !('recipient_id' in payload) || !('message_id' in payload)) throw new Error('Facebook returned an invalid message response.');
    return { ...payload, statusCode: response.status };
  } catch (error) {
    await logFacebookApiError('sendFacebookMessage', 'Facebook Graph API /me/messages', error, { recipientId });
    throw error;
  }
}
