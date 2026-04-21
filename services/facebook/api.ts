
/**
 * @fileoverview Core functions for interacting with the Facebook Graph API.
 * 
 * Uses v25.0 (current version) aligned with Meta's Facebook Login for Business
 * and Messenger Platform specifications.
 * 
 * @see https://developers.facebook.com/docs/graph-api/
 * @see https://developers.facebook.com/docs/messages
 * @see https://developers.facebook.com/docs/pages-api
 */
'use server';
import * as mime from 'mime-types';
import { toAppUrl } from '@/core/lib/app-url';

const API_VERSION = 'v25.0';
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
  category_list?: Array<{ id: string; name: string }>;
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
  value: number | { [key: string]: number };
  end_time?: string;
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
  paging?: {
    previous?: string;
    next?: string;
  };
};

export type PostInsightsResponse = {
  data: PostInsightMetric[];
}

export type PageInsightsQueryContext = {
  since?: string;
  until?: string;
  period?: 'day' | 'week' | 'days_28' | 'month' | 'lifetime' | 'total_over_range';
  breakdown?: string;
  metricType?: string;
  showDescription?: boolean;
};

type PagePost = {
  id: string;
  created_time: string;
  message?: string;
  story?: string;
  permalink_url: string;
  shares?: {
    count?: number;
  };
  reactions?: {
    summary?: {
      total_count?: number;
    };
  };
  comments?: {
    summary?: {
      total_count?: number;
    };
  };
}

export type PageFeedResponse = {
  data: PagePost[];
  paging: {
    previous: string;
    next: string;
  }
}

export type PageRole = {
  id: string;
  name: string;
  tasks: string[];
};

export type PageRolesResponse = {
  data: PageRole[];
};

export type PageSettingsResponse = {
  data: Array<{
    setting: string;
    value: boolean | string | number;
  }>;
};

export type PageReview = {
  created_time: string;
  recommendation_type?: 'positive' | 'negative' | string;
  review_text?: string;
  reviewer?: {
    name: string;
    id: string;
  };
};

export type PageRatingsResponse = {
  data: PageReview[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
};

export type PostComment = {
  id: string;
  message?: string;
  created_time?: string;
  from?: {
    id: string;
    name: string;
  };
};

export type GetPostCommentsResponse = {
  data: PostComment[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
  };
};

export type PostCommentResponse = {
  id: string;
};


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
    redirect_uri: "https://neupgroup.com/socials/bridge/callback.v1/auth.meta",
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
  context?: PageInsightsQueryContext
): Promise<PageInsightsResponse> {
  const params = new URLSearchParams({
    access_token: pageToken,
    metric: metrics.join(','),
  });

  if (context?.since) {
    params.append('since', context.since);
  }
  if (context?.until) {
    params.append('until', context.until);
  }
  if (context?.period) {
    params.append('period', context.period);
  }
  if (context?.breakdown) {
    params.append('breakdown', context.breakdown);
  }
  if (context?.metricType) {
    params.append('metric_type', context.metricType);
  }
  if (typeof context?.showDescription === 'boolean') {
    params.append('show_description_from_api_doc', String(context.showDescription));
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
  metrics: string[],
  context?: Pick<PageInsightsQueryContext, 'since' | 'until' | 'period'>
): Promise<PostInsightsResponse> {
  const params = new URLSearchParams({
    access_token: pageToken,
    metric: metrics.join(','),
  });

  if (context?.since) {
    params.append('since', context.since);
  }
  if (context?.until) {
    params.append('until', context.until);
  }
  if (context?.period) {
    params.append('period', context.period);
  }

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
    fields: 'id,created_time,message,story,permalink_url,shares,reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0)',
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

/**
 * Installs this app on the page for webhook delivery with selected fields.
 */
export async function subscribeAppToPageWebhooks(
  pageId: string,
  pageToken: string,
  subscribedFields: string[]
): Promise<{ success: boolean | string }> {
  const fields = Array.from(new Set(subscribedFields.filter(Boolean)));
  if (!fields.length) {
    return { success: true };
  }

  const params = new URLSearchParams({
    access_token: pageToken,
    subscribed_fields: fields.join(','),
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${pageId}/subscribed_apps`, {
    method: 'POST',
    body: params,
  });

  return handleApiResponse<{ success: boolean | string }>(res);
}

/**
 * Gets people who can perform tasks on the page and their task assignments.
 */
export async function getPageRoles(pageId: string, pageToken: string): Promise<PageRolesResponse> {
  const params = new URLSearchParams({
    access_token: pageToken,
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${pageId}/roles?${params.toString()}`);
  return handleApiResponse<PageRolesResponse>(res);
}

/**
 * Gets details for a page using requested fields.
 */
export async function getPageDetails<T extends Record<string, unknown>>(
  pageId: string,
  pageToken: string,
  fields: string[]
): Promise<T> {
  const params = new URLSearchParams({
    access_token: pageToken,
    fields: fields.join(','),
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${pageId}?${params.toString()}`);
  return handleApiResponse<T>(res);
}

/**
 * Updates page details such as about, bio, emails, website, etc.
 */
export async function updatePageDetails(
  pageId: string,
  pageToken: string,
  updates: Record<string, string | number | boolean>
): Promise<{ success: boolean }> {
  const params = new URLSearchParams({
    access_token: pageToken,
  });

  Object.entries(updates).forEach(([key, value]) => {
    params.append(key, String(value));
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${pageId}`, {
    method: 'POST',
    body: params,
  });

  return handleApiResponse<{ success: boolean }>(res);
}

/**
 * Gets page settings.
 */
export async function getPageSettings(pageId: string, pageToken: string): Promise<PageSettingsResponse> {
  const params = new URLSearchParams({
    access_token: pageToken,
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${pageId}/settings?${params.toString()}`);
  return handleApiResponse<PageSettingsResponse>(res);
}

/**
 * Updates page settings via option payload.
 */
export async function updatePageSetting(
  pageId: string,
  pageToken: string,
  setting: string,
  value: boolean | string | number
): Promise<{ success: boolean }> {
  const params = new URLSearchParams({
    access_token: pageToken,
    option: JSON.stringify({ [setting]: value }),
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${pageId}/settings`, {
    method: 'POST',
    body: params,
  });

  return handleApiResponse<{ success: boolean }>(res);
}

/**
 * Gets page reviews/ratings.
 */
export async function getPageRatings(
  pageId: string,
  pageToken: string,
  limit = 25
): Promise<PageRatingsResponse> {
  const params = new URLSearchParams({
    access_token: pageToken,
    limit: String(limit),
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${pageId}/ratings?${params.toString()}`);
  return handleApiResponse<PageRatingsResponse>(res);
}

/**
 * Blocks a person on the page by page-scoped ID.
 */
export async function blockPageUser(
  pageId: string,
  pageToken: string,
  userPsid: string
): Promise<Record<string, boolean>> {
  const params = new URLSearchParams({
    access_token: pageToken,
    user: userPsid,
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${pageId}/blocked`, {
    method: 'POST',
    body: params,
  });

  return handleApiResponse<Record<string, boolean>>(res);
}

/**
 * Accepts or rejects a Meta-proposed page change.
 */
export async function respondToPageChangeProposal(
  proposalId: string,
  pageToken: string,
  accept: boolean
): Promise<{ success: boolean }> {
  const params = new URLSearchParams({
    access_token: pageToken,
    accept: accept ? 'true' : 'false',
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${proposalId}`, {
    method: 'POST',
    body: params,
  });

  return handleApiResponse<{ success: boolean }>(res);
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

/**
 * Fetches comments on a specific post.
 * @param postId The ID of the post to fetch comments for
 * @param pageToken The Page Access Token with pages_read_engagement permission
 * @param limit Maximum number of comments to fetch (default: 25)
 * @see https://developers.facebook.com/docs/pages-api/posts
 */
export async function getPostComments(
  postId: string,
  pageToken: string,
  limit = 25
): Promise<GetPostCommentsResponse> {
  const params = new URLSearchParams({
    access_token: pageToken,
    fields: 'id,message,created_time,from{id,name}',
    limit: String(limit),
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${postId}/comments?${params.toString()}`);
  return handleApiResponse<GetPostCommentsResponse>(res);
}

/**
 * Posts a comment on a Facebook Page post.
 * Page will be the author of the comment.
 * @param postId The ID of the post to comment on
 * @param pageToken The Page Access Token with pages_manage_engagement permission
 * @param message The comment text (can include @mentions as @[PSID])
 * @see https://developers.facebook.com/docs/pages-api/comments
 */
export async function postCommentOnPost(
  postId: string,
  pageToken: string,
  message: string
): Promise<PostCommentResponse> {
  const params = new URLSearchParams({
    access_token: pageToken,
    message,
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${postId}/comments`, {
    method: 'POST',
    body: params,
  });

  return handleApiResponse<PostCommentResponse>(res);
}

/**
 * Posts a reply to a comment on a Facebook Page.
 * Page will be the author of the reply.
 * @param commentId The ID of the comment to reply to
 * @param pageToken The Page Access Token with pages_manage_engagement permission
 * @param message The reply text (can include @mentions as @[PSID] or @[PSID,PSID])
 * @see https://developers.facebook.com/docs/pages-api/comments
 */
export async function postReplyToComment(
  commentId: string,
  pageToken: string,
  message: string
): Promise<PostCommentResponse> {
  const params = new URLSearchParams({
    access_token: pageToken,
    message,
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${commentId}`, {
    method: 'POST',
    body: params,
  });

  return handleApiResponse<PostCommentResponse>(res);
}
/**
 * Posts a private reply to a comment on a Facebook Page.
 * @param commentId The ID of the comment to reply to.
 * @param pageToken The Page Access Token.
 * @param message The reply text.
 */
export async function sendFacebookPrivateReply(
  commentId: string,
  pageToken: string,
  message: string
): Promise<{ messageId: string }> {
  const params = new URLSearchParams({
    access_token: pageToken,
    message,
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${commentId}/private_replies`, {
    method: 'POST',
    body: params,
  });

  const payload = await handleApiResponse<{ id?: string }>(res);
  const messageId = String(payload.id ?? '').trim();
  if (!messageId) {
    throw new Error('No message ID returned from Facebook private reply API.');
  }

  return { messageId };
}
