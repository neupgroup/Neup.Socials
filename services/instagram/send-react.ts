'use server';

import { instagramApiRequest } from './api';

export async function sendInstagramReaction({ igUserId, recipientId, accessToken, reaction }: {
  igUserId: string; recipientId: string; accessToken: string; reaction: string;
}) {
  return instagramApiRequest<Record<string, unknown>>(`/${encodeURIComponent(igUserId)}/messages`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text: reaction } }),
  });
}
