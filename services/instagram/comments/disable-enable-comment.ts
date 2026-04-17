import { instagramRequest, type InstagramSuccessResponse } from './shared';

export async function setInstagramMediaCommentsEnabled(
  mediaId: string,
  accessToken: string,
  enabled: boolean
): Promise<InstagramSuccessResponse> {
  return instagramRequest<InstagramSuccessResponse>(`/${mediaId}`, {
    method: 'POST',
    accessToken,
    body: {
      comment_enabled: enabled,
    },
  });
}

export async function disableInstagramMediaComments(
  mediaId: string,
  accessToken: string
): Promise<InstagramSuccessResponse> {
  return setInstagramMediaCommentsEnabled(mediaId, accessToken, false);
}

export async function enableInstagramMediaComments(
  mediaId: string,
  accessToken: string
): Promise<InstagramSuccessResponse> {
  return setInstagramMediaCommentsEnabled(mediaId, accessToken, true);
}
