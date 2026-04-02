'use server';

import { instagramRequest, type InstagramReplyCommentResponse } from './shared';

export async function replyToInstagramComment(
  commentId: string,
  accessToken: string,
  message: string
): Promise<InstagramReplyCommentResponse> {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    throw new Error('Instagram comment reply message is required.');
  }

  return instagramRequest<InstagramReplyCommentResponse>(`/${commentId}/replies`, {
    method: 'POST',
    accessToken,
    body: {
      message: trimmedMessage,
    },
  });
}
