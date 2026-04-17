import { instagramRequest, type InstagramCommentsResponse } from './shared';

const DEFAULT_COMMENT_FIELDS = 'id,text,timestamp,username,hidden,like_count,parent_id';

export async function getInstagramMediaComments(
  mediaId: string,
  accessToken: string,
  options?: {
    fields?: string;
    limit?: number;
    after?: string;
  }
): Promise<InstagramCommentsResponse> {
  const limit = Math.min(Math.max(options?.limit ?? 25, 1), 50);

  return instagramRequest<InstagramCommentsResponse>(`/${mediaId}/comments`, {
    accessToken,
    query: {
      fields: options?.fields ?? DEFAULT_COMMENT_FIELDS,
      limit,
      after: options?.after,
    },
  });
}
