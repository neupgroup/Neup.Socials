export const INSTAGRAM_GRAPH_API_BASE_URL = 'https://graph.instagram.com/v25.0';

export type InstagramPaging = {
  cursors?: {
    before?: string;
    after?: string;
  };
  next?: string;
};

export type InstagramCommentAuthor = {
  id?: string;
  username?: string;
};

export type InstagramComment = {
  id: string;
  text?: string;
  timestamp?: string;
  hidden?: boolean;
  like_count?: number;
  parent_id?: string;
  user?: string;
  username?: string;
  from?: InstagramCommentAuthor;
  media?: {
    id?: string;
  };
  replies?: {
    data?: InstagramComment[];
    paging?: InstagramPaging;
  };
};

export type InstagramCommentsResponse = {
  data: InstagramComment[];
  paging?: InstagramPaging;
};

export type InstagramCommentRepliesResponse = {
  data: InstagramComment[];
  paging?: InstagramPaging;
};

export type InstagramReplyCommentResponse = {
  id: string;
};

export type InstagramSuccessResponse = {
  success: boolean;
};

type InstagramApiErrorResponse = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

function buildInstagramUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(`${INSTAGRAM_GRAPH_API_BASE_URL}${path}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

async function handleInstagramApiResponse<T>(res: Response): Promise<T> {
  const raw = await res.text();
  const json = raw ? (JSON.parse(raw) as T | InstagramApiErrorResponse) : ({} as T);

  if (!res.ok) {
    const error = json as InstagramApiErrorResponse;
    throw new Error(error.error?.message || `Instagram API request failed with status ${res.status}.`);
  }

  return json as T;
}

export async function instagramRequest<T>(
  path: string,
  {
    method = 'GET',
    accessToken,
    query,
    body,
  }: {
    method?: 'GET' | 'POST' | 'DELETE';
    accessToken: string;
    query?: Record<string, string | number | boolean | undefined>;
    body?: Record<string, unknown>;
  }
): Promise<T> {
  const res = await fetch(buildInstagramUrl(path, query), {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });

  return handleInstagramApiResponse<T>(res);
}
