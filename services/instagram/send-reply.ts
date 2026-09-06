'use server';

import { instagramApiRequest } from './api';

export type InstagramSendMessageResponse = { recipient_id: string; message_id: string };

export async function sendInstagramReply({ igUserId, recipientId, accessToken, text, replyToMessageId }: {
  igUserId: string; recipientId: string; accessToken: string; text: string; replyToMessageId?: string;
}) {
  if (!text.trim()) throw new Error('Instagram message text is required.');
  return instagramApiRequest<InstagramSendMessageResponse>(`/${encodeURIComponent(igUserId)}/messages`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text: text.trim() }, ...(replyToMessageId ? { reply_to: { message_id: replyToMessageId } } : {}) }),
  });
}
