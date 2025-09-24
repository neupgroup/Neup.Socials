
/**
 * @fileoverview Core functions for interacting with the Facebook Graph API.
 */
'use server';
import * as mime from 'mime-types';

const API_VERSION = 'v20.0';
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

type AccessTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type ErrorResponse = {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
};

type UserPage = {
    id: string;
    name: string;
    access_token: string;
    category: string;
    tasks: string[];
}

type UserPagesResponse = {
    data: UserPage[];
    paging?: {
        cursors: {
            before: string;
            after: string;
        }
    }
}

type DebugTokenData = {
    app_id: string;
    type: 'PAGE' | 'USER';
    application: string;
    data_access_expires_at: number;
    expires_at: number;
    is_valid: boolean;
    issued_at: number;
    scopes: string[];
    user_id: string;
}

type DebugTokenResponse = {
    data: DebugTokenData;
}

type PublishPostResponse = {
    id: string;
    post_id?: string; // for photos
}

export type InsightValue = {
  value: number;
  end_time: string;
};

export type InsightMetric = {
  name: string;
  period: string;
  values: InsightValue[];
  title: string;
  description: string;
  id: string;
};

export type PostInsightValue = {
    value: number | { [key: string]: number };
}

export type PostInsightMetric = {
    name: string;
    period: string;
    values: PostInsightValue[];
    title: string;
    description: string;
    id: string;
}

export type PageInsightsResponse = {
  data: InsightMetric[];
  paging: {
    previous: string;
    next: string;
  };
};

export type PostInsightsResponse = {
    data: PostInsightMetric[];
}

type PagePost = {
  id: string;
  created_time: string;
  message?: string;
  story?: string;
  permalink_url: string;
}

export type PageFeedResponse = {
    data: PagePost[];
    paging: {
        previous: string;
        next: string;
    }
}


async function handleApiResponse<T>(res: Response): Promise<T> {
    const json = await res.json();
    if (!res.ok) {
        const error = json as ErrorResponse;
        console.error('Facebook API Error:', error);
        throw new Error(error.error?.message || 'An unknown Facebook API error occurred.');
    }
    return json as T;
}

/**
 * Exchanges an authorization code for a short-lived user access token.
 */
export async function exchangeCodeForShortLivedToken(code: string): Promise<AccessTokenResponse> {
  const params = new URLSearchParams({
    client_id: process.env.FB_APP_ID!,
    redirect_uri: process.env.FB_REDIRECT_URI!,
    client_secret: process.env.FB_APP_SECRET!,
    code,
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/oauth/access_token?${params.toString()}`);
  return handleApiResponse<AccessTokenResponse>(res);
}


/**
 * Exchanges a short-lived user access token for a long-lived one.
 */
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<AccessTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: process.env.FB_APP_ID!,
    client_secret: process.env.FB_APP_SECRET!,
    fb_exchange_token: shortLivedToken,
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/oauth/access_token?${params.toString()}`);
  return handleApiResponse<AccessTokenResponse>(res);
}

/**
 * Fetches the Facebook Pages that a user administers.
 * This also returns a non-expiring Page Access Token for each page.
 */
export async function getUserPages(longLivedUserToken: string): Promise<UserPagesResponse> {
  const params = new URLSearchParams({
    fields: 'id,name,access_token,category,tasks',
    access_token: longLivedUserToken,
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/me/accounts?${params.toString()}`);
  return handleApiResponse<UserPagesResponse>(res);
}

/**
 * Validates a Page Access Token to ensure it's still valid.
 */
export async function validateToken(pageToken: string): Promise<DebugTokenResponse> {
    const appAccessToken = `${process.env.FB_APP_ID}|${process.env.FB_APP_SECRET}`;
    const params = new URLSearchParams({
        input_token: pageToken,
        access_token: appAccessToken,
    });

    const res = await fetch(`${GRAPH_API_BASE_URL}/debug_token?${params.toString()}`);
    return handleApiResponse<DebugTokenResponse>(res);
}

/**
 * Fetches insights for a specific Facebook Page.
 * @param pageId The ID of the Facebook Page.
 * @param pageToken The Page Access Token.
 * @param metrics An array of metric names to fetch.
 * @param since The start date for the query (e.g., 'YYYY-MM-DD').
 * @param until The end date for the query (e.g., 'YYYY-MM-DD').
 * @returns The response from the Facebook API containing the insights data.
 */
export async function getPageInsights(
  pageId: string,
  pageToken: string,
  metrics: string[],
  since?: string,
  until?: string
): Promise<PageInsightsResponse> {
  const params = new URLSearchParams({
    access_token: pageToken,
    metric: metrics.join(','),
  });

  if (since) {
    params.append('since', since);
  }
  if (until) {
    params.append('until', until);
  }

  const res = await fetch(`${GRAPH_API_BASE_URL}/${pageId}/insights?${params.toString()}`);
  return handleApiResponse<PageInsightsResponse>(res);
}

/**
 * Fetches insights for a specific Facebook Page Post.
 * @param postId The ID of the Facebook Page Post.
 * @param pageToken The Page Access Token.
 * @param metrics An array of metric names to fetch.
 * @returns The response from the Facebook API containing the post insights data.
 */
export async function getPagePostInsights(
    postId: string,
    pageToken: string,
    metrics: string[]
): Promise<PostInsightsResponse> {
    const params = new URLSearchParams({
        access_token: pageToken,
        metric: metrics.join(','),
    });

    const res = await fetch(`${GRAPH_API_BASE_URL}/${postId}/insights?${params.toString()}`);
    return handleApiResponse<PostInsightsResponse>(res);
}


/**
 * Fetches a list of posts from a Facebook Page's feed.
 * @param pageId The ID of the Facebook Page.
 * @param pageToken The Page Access Token.
 * @param since The start unix timestamp for the query.
 * @param until The end unix timestamp for the query.
 * @returns The response from the Facebook API containing the feed data.
 */
export async function getPosts(
  pageId: string,
  pageToken: string,
  since?: number,
  until?: number
): Promise<PageFeedResponse> {
  const params = new URLSearchParams({
    access_token: pageToken,
    fields: 'id,created_time,message,story,permalink_url',
    limit: '100', // Fetch up to 100 posts per request
  });

  if (since) {
    params.append('since', String(since));
  }
  if (until) {
    params.append('until', String(until));
  }

  const res = await fetch(`${GRAPH_API_BASE_URL}/${pageId}/feed?${params.toString()}`);
  return handleApiResponse<PageFeedResponse>(res);
}


const getFullMediaUrl = (url: string) => {
    return url && !url.startsWith('http') ? `https://neupgroup.com${url}` : url;
};

/**
 * Uploads a single photo to be attached to a post later.
 * @returns The ID of the uploaded photo.
 */
async function uploadPhotoForAttachment(pageId: string, pageToken: string, photoUrl: string): Promise<string> {
    const endpoint = `${GRAPH_API_BASE_URL}/${pageId}/photos`;
    const params = new URLSearchParams({
        access_token: pageToken,
        url: getFullMediaUrl(photoUrl),
        published: 'false', // We are not publishing it directly
    });

    const res = await fetch(endpoint, {
        method: 'POST',
        body: params,
    });

    const response = await handleApiResponse<{ id: string }>(res);
    return response.id;
}


/**
 * Publishes content to a Facebook Page.
 * @param pageId The ID of the Facebook Page.
 * @param pageToken The Page Access Token.
 * @param content The text content of the post.
 * @param mediaUrls Optional array of URLs of images or videos to attach.
 * @param ctaType Optional CTA button type.
 * @param ctaLink Optional link for the CTA button.
 * @returns The response from the Facebook API, typically containing the post ID.
 */
export async function publishToPage(
  pageId: string,
  pageToken: string,
  content: string,
  mediaUrls?: string[],
  ctaType?: string,
  ctaLink?: string,
): Promise<PublishPostResponse> {
  
  const hasMedia = Array.isArray(mediaUrls) && mediaUrls.length > 0;

  // Handle multi-photo posts
  if (hasMedia && mediaUrls.length > 1) {
    const photoIds = await Promise.all(
        mediaUrls.map(url => uploadPhotoForAttachment(pageId, pageToken, url))
    );

    const feedEndpoint = `${GRAPH_API_BASE_URL}/${pageId}/feed`;
    const feedParams = new URLSearchParams({
        access_token: pageToken,
        message: content,
    });
    
    photoIds.forEach(id => feedParams.append('attached_media[]', `{"media_fbid":"${id}"}`));

    if (ctaType && ctaType !== 'NONE' && ctaLink) {
        feedParams.append('call_to_action', JSON.stringify({ type: ctaType, value: { link: ctaLink } }));
    }

    const res = await fetch(feedEndpoint, {
        method: 'POST',
        body: feedParams,
    });
    return handleApiResponse<PublishPostResponse>(res);
  }

  // Handle single media post or text-only post
  const params = new URLSearchParams({ access_token: pageToken });
  let endpoint = `${GRAPH_API_BASE_URL}/${pageId}/feed`;

  if (ctaType && ctaType !== 'NONE' && ctaLink) {
      params.append('call_to_action', JSON.stringify({ type: ctaType, value: { link: ctaLink } }));
  }

  if (hasMedia && mediaUrls.length === 1) {
    const mediaUrl = mediaUrls[0];
    const fullMediaUrl = getFullMediaUrl(mediaUrl);
    const mimeType = mime.lookup(fullMediaUrl) || '';

    if (mimeType.startsWith('image/')) {
      endpoint = `${GRAPH_API_BASE_URL}/${pageId}/photos`;
      params.append('url', fullMediaUrl);
      params.append('caption', content);
    } else if (mimeType.startsWith('video/')) {
      endpoint = `${GRAPH_API_BASE_URL}/${pageId}/videos`;
      params.append('file_url', fullMediaUrl);
      params.append('description', content);
    } else {
        // Fallback for unknown media types: post as a link in the message
        params.append('message', `${content}\n\n${fullMediaUrl}`);
    }
  } else {
    // Text-only post
    params.append('message', content);
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    body: params,
  });

  return handleApiResponse<PublishPostResponse>(res);
}
