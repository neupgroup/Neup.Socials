'use server';

import {
  instagramRequest,
  type InstagramCommentRepliesResponse,
  type InstagramComment,
} from './shared';

const DEFAULT_REPLY_FIELDS = 'id,text,timestamp,username,hidden,like_count,parent_id';

type InstagramCommentRepliesNodeResponse = {
  replies?: {
    data?: InstagramComment[];
    paging?: InstagramCommentRepliesResponse['paging'];
  };
};

export async function getInstagramCommentReplies(
  commentId: string,
  accessToken: string,
  options?: {
    fields?: string;
    limit?: number;
  }
): Promise<InstagramCommentRepliesResponse> {
  const limit = Math.max(options?.limit ?? 25, 1);
  const fields = `replies.limit(${limit}){${options?.fields ?? DEFAULT_REPLY_FIELDS}}`;

  const response = await instagramRequest<InstagramCommentRepliesNodeResponse>(`/${commentId}`, {
    accessToken,
    query: {
      fields,
    },
  });

  return {
    data: response.replies?.data ?? [],
    paging: response.replies?.paging,
  };
}
