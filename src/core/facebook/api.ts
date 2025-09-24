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
 * Publishes content to a Facebook Page.
 * @param pageId The ID of the Facebook Page.
 * @param pageToken The Page Access Token.
 * @param content The text content of the post.
 * @param mediaUrl Optional URL of an image or video to attach.
 * @returns The response from the Facebook API, typically containing the post ID.
 */
export async function publishToPage(
  pageId: string,
  pageToken: string,
  content: string,
  mediaUrl?: string
): Promise<PublishPostResponse> {
  
  if (mediaUrl) {
    const fullMediaUrl = mediaUrl.startsWith('http') ? mediaUrl : `https://neupgroup.com${mediaUrl}`;
    const mimeType = mime.lookup(fullMediaUrl);

    if (mimeType && mimeType.startsWith('image/')) {
      // It's an image
      const params = new URLSearchParams({
        url: fullMediaUrl,
        caption: content,
        access_token: pageToken,
      });
      const res = await fetch(`${GRAPH_API_BASE_URL}/${pageId}/photos`, {
        method: 'POST',
        body: params,
      });
      return handleApiResponse<PublishPostResponse>(res);
    } else if (mimeType && mimeType.startsWith('video/')) {
      // It's a video
      const params = new URLSearchParams({
        file_url: fullMediaUrl,
        description: content,
        access_token: pageToken,
      });
      const res = await fetch(`${GRAPH_API_BASE_URL}/${pageId}/videos`, {
        method: 'POST',
        body: params,
      });
      return handleApiResponse<PublishPostResponse>(res);
    }
  }

  // Default to text-only post
  const params = new URLSearchParams({
    message: content,
    access_token: pageToken,
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${pageId}/feed`, {
    method: 'POST',
    body: params,
  });

  return handleApiResponse<PublishPostResponse>(res);
}
