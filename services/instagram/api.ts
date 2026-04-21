
/**
 * @fileoverview Core functions for interacting with the Instagram API with Instagram Login.
 */
'use server';

import { toAppUrl } from '@/core/lib/app-url';

const API_BASE_URL = 'https://api.instagram.com';
const GRAPH_API_BASE_URL = 'https://graph.instagram.com';
const GRAPH_API_VERSION = 'v25.0';

type AccessTokenResponse = {
  access_token: string;
  user_id: number;
  permissions?: string;
};

type LongLivedTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
}

type UserProfile = {
  user_id: string;
  username: string;
}

type ErrorResponse = {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
};

async function handleApiResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    const error = json as ErrorResponse;
    console.error('Instagram API Error:', error);
    throw new Error(error.error?.message || 'An unknown Instagram API error occurred.');
  }
  return json as T;
}


/**
 * Exchanges an authorization code for a short-lived user access token.
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri?: string
): Promise<AccessTokenResponse> {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri ?? toAppUrl('/bridge/callback.v1/auth.meta'),
    code,
  });

  const res = await fetch(`${API_BASE_URL}/oauth/access_token`, {
    method: 'POST',
    body: params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  return handleApiResponse<AccessTokenResponse>(res);
}

/**
 * Exchanges a short-lived user access token for a long-lived one (60 days).
 */
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<LongLivedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    access_token: shortLivedToken,
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/access_token?${params.toString()}`);
  return handleApiResponse<LongLivedTokenResponse>(res);
}

/**
 * Fetches the user's profile information.
 */
export async function getUserProfile(longLivedToken: string): Promise<UserProfile> {
  const params = new URLSearchParams({
    fields: 'user_id,username',
    access_token: longLivedToken,
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/me?${params.toString()}`);
  return handleApiResponse<UserProfile>(res);
}
