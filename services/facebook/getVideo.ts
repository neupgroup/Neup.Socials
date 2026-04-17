/**
 * @fileoverview Core helpers for fetching watchable Facebook video data.
 *
 * Uses Graph API v25.0.
 */
'use server';

const API_VERSION = 'v25.0';
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

type ErrorResponse = {
  error?: {
    message?: string;
  };
};

type PostVideoLookupResponse = {
  id?: string;
  object_id?: string;
  permalink_url?: string;
};

type VideoNodeResponse = {
  id: string;
  source?: string;
  permalink_url?: string;
  embed_html?: string;
  title?: string;
  description?: string;
  length?: number;
  views?: number;
  post_views?: number;
  created_time?: string;
  from?: {
    id?: string;
    name?: string;
  };
  thumbnails?: {
    data?: Array<{
      uri?: string;
    }>;
  };
};

export type FacebookWatchableVideo = {
  id: string;
  sourceUrl?: string;
  embedHtml?: string;
  permalinkUrl?: string;
  title?: string;
  description?: string;
  lengthSeconds?: number;
  views?: number;
  thumbnailUrl?: string;
};

async function handleApiResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    const error = json as ErrorResponse;
    throw new Error(error.error?.message || 'Facebook API request failed');
  }
  return json as T;
}

async function getPostVideoCandidates(postId: string, pageToken: string): Promise<string[]> {
  const params = new URLSearchParams({
    access_token: pageToken,
    fields: 'id,object_id,permalink_url',
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${postId}?${params.toString()}`);
  const payload = await handleApiResponse<PostVideoLookupResponse>(res);

  const candidates = new Set<string>();

  if (payload.object_id) {
    candidates.add(payload.object_id);
  }

  return Array.from(candidates);
}

async function getVideoById(videoId: string, pageToken: string): Promise<FacebookWatchableVideo | null> {
  const params = new URLSearchParams({
    access_token: pageToken,
    fields: 'id,source,permalink_url,embed_html,title,description,length,views,post_views,thumbnails.limit(1){uri}',
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${videoId}?${params.toString()}`);
  const payload = await handleApiResponse<VideoNodeResponse>(res);

  if (!payload.id) {
    return null;
  }

  return {
    id: payload.id,
    sourceUrl: payload.source,
    embedHtml: payload.embed_html,
    permalinkUrl: payload.permalink_url,
    title: payload.title,
    description: payload.description,
    lengthSeconds: payload.length,
    views: payload.views ?? payload.post_views,
    thumbnailUrl: payload.thumbnails?.data?.[0]?.uri,
  };
}

/**
 * Resolves a watchable Facebook video for a post.
 * The post may reference a video through object_id or attachment targets.
 */
export async function getWatchableVideoFromPost(
  postId: string,
  pageToken: string
): Promise<FacebookWatchableVideo | null> {
  const candidates = await getPostVideoCandidates(postId, pageToken);

  for (const candidateId of candidates) {
    try {
      const video = await getVideoById(candidateId, pageToken);
      if (video?.sourceUrl || video?.embedHtml || video?.permalinkUrl) {
        return video;
      }
    } catch {
      // Keep iterating candidates when one candidate is not a video node.
    }
  }

  return null;
}
