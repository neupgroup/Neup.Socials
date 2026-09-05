'use server';

import { logFacebookApiError, FACEBOOK_GRAPH_API_BASE_URL, getFacebookApi } from './api';

export type FacebookMessageResponse = { recipient_id: string; message_id: string; statusCode: number };

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
