'use server';

import data from '$/data.json';
import { encrypt } from '#/core/helpers/crypto';

const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username,avatar_url';

type TikTokTokenResponse = {
  access_token: string;
  expires_in: number;
  open_id: string;
  refresh_expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
};

type TikTokUserResponse = {
  data?: {
    user?: {
      open_id?: string;
      display_name?: string;
      username?: string;
      avatar_url?: string;
    };
  };
  error?: { code?: string; message?: string; log_id?: string };
};

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || (body as { error?: string }).error) {
    const error = body as { error?: string; error_description?: string; message?: string; log_id?: string };
    throw new Error(error.error_description || error.message || error.error || `TikTok API request failed (${response.status}).`);
  }
  return body as T;
}

export async function exchangeTikTokCode(code: string, codeVerifier?: string): Promise<TikTokTokenResponse> {
  const params = new URLSearchParams({
    client_key: data.tiktok.client_key,
    client_secret: data.tiktok.client_secret,
    code: decodeURIComponent(code),
    grant_type: 'authorization_code',
    redirect_uri: data.tiktok.redirect_uri,
  });

  if (codeVerifier) params.set('code_verifier', codeVerifier);

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: params,
    cache: 'no-store',
  });

  return parseResponse<TikTokTokenResponse>(response);
}

export async function getTikTokUser(accessToken: string) {
  const response = await fetch(USER_INFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  const result = await parseResponse<TikTokUserResponse>(response);
  if (!result.data?.user?.open_id) throw new Error('TikTok did not return a user profile.');
  return result.data.user;
}

export async function refreshTikTokAccessToken(refreshToken: string): Promise<TikTokTokenResponse> {
  const params = new URLSearchParams({
    client_key: data.tiktok.client_key,
    client_secret: data.tiktok.client_secret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: params,
    cache: 'no-store',
  });

  return parseResponse<TikTokTokenResponse>(response);
}

export async function encryptTikTokToken(token: string) {
  return encrypt(token);
}

