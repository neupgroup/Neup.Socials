'use server';

import { instagramRequest, type InstagramSuccessResponse } from './shared';

export async function setInstagramCommentHidden(
  commentId: string,
  accessToken: string,
  hidden: boolean
): Promise<InstagramSuccessResponse> {
  return instagramRequest<InstagramSuccessResponse>(`/${commentId}`, {
    method: 'POST',
    accessToken,
    query: {
      hide: hidden,
    },
  });
}

export async function hideInstagramComment(
  commentId: string,
  accessToken: string
): Promise<InstagramSuccessResponse> {
  return setInstagramCommentHidden(commentId, accessToken, true);
}

export async function unhideInstagramComment(
  commentId: string,
  accessToken: string
): Promise<InstagramSuccessResponse> {
  return setInstagramCommentHidden(commentId, accessToken, false);
}
