import { instagramRequest, type InstagramSuccessResponse } from './shared';

export async function deleteInstagramComment(
  commentId: string,
  accessToken: string
): Promise<InstagramSuccessResponse> {
  return instagramRequest<InstagramSuccessResponse>(`/${commentId}`, {
    method: 'DELETE',
    accessToken,
  });
}
