/**
 * @fileoverview Core functions for Facebook Page post comments.
 */
'use server';

const API_VERSION = 'v23.0';
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

type ErrorResponse = {
  error: {
    message: string;
  };
};

type FacebookPostsWithCommentsResponse = {
  data: Array<{
    id: string;
    message?: string;
    permalink_url?: string;
    comments?: {
      data?: Array<{
        id: string;
        message?: string;
        created_time?: string;
        from?: {
          id: string;
          name: string;
        };
      }>;
    };
  }>;
};

type FacebookCommentDetailResponse = {
  id: string;
  message?: string;
  created_time?: string;
  from?: {
    id: string;
    name: string;
  };
};

export type FacebookPostCommentItem = {
  postId: string;
  postMessage: string;
  permalinkUrl?: string;
  commentId: string;
  commentText: string;
  createdTime: string;
  commenterId: string;
  commenterName: string;
};

async function handleApiResponse<T>(res: Response): Promise<T> {
  const json = await res.json();

  if (!res.ok) {
    const error = json as ErrorResponse;
    throw new Error(error.error?.message || 'Facebook API request failed.');
  }

  return json as T;
}

/**
 * Fetches recent posts for a page and expands comments for each post.
 */
export async function getPagePostComments(
  pageId: string,
  pageToken: string,
  options?: {
    postLimit?: number;
    commentLimit?: number;
  }
): Promise<FacebookPostCommentItem[]> {
  const postLimit = options?.postLimit ?? 10;
  const commentLimit = options?.commentLimit ?? 10;

  const params = new URLSearchParams({
    access_token: pageToken,
    limit: String(postLimit),
    fields: `id,message,permalink_url,comments.limit(${commentLimit}){id,message,created_time,from}`,
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${pageId}/feed?${params.toString()}`);
  const payload = await handleApiResponse<FacebookPostsWithCommentsResponse>(res);

  const items: FacebookPostCommentItem[] = [];

  for (const post of payload.data ?? []) {
    for (const comment of post.comments?.data ?? []) {
      if (!comment.id || !comment.message || !comment.from?.id || !comment.from?.name) {
        continue;
      }

      // Keep only user-side comments in the inbox stream.
      if (comment.from.id === pageId) {
        continue;
      }

      items.push({
        postId: post.id,
        postMessage: post.message ?? '',
        permalinkUrl: post.permalink_url,
        commentId: comment.id,
        commentText: comment.message,
        createdTime: comment.created_time ?? new Date().toISOString(),
        commenterId: comment.from.id,
        commenterName: comment.from.name,
      });
    }
  }

  return items;
}

/**
 * Fetches a single page comment by id.
 */
export async function getPageCommentById(
  commentId: string,
  pageToken: string
): Promise<FacebookCommentDetailResponse> {
  const params = new URLSearchParams({
    access_token: pageToken,
    fields: 'id,message,created_time,from',
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${commentId}?${params.toString()}`);
  return handleApiResponse<FacebookCommentDetailResponse>(res);
}
