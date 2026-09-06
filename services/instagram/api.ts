'use server';

import data from '$/data.json';

const GRAPH_API_BASE_URL = 'https://graph.instagram.com/v23.0';

export type InstagramApiError = { error?: { message?: string; type?: string; code?: number; fbtrace_id?: string } };

export async function instagramApiRequest<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${GRAPH_API_BASE_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...(init.headers ?? {}) },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => null) as T | InstagramApiError | null;
  if (!response.ok) throw new Error((payload as InstagramApiError | null)?.error?.message || `Instagram API request failed (${response.status}).`);
  return payload as T;
}

export type InstagramConversationListResponse = { data?: Array<{ id: string }>; paging?: { next?: string } };
export type InstagramConversationMessagesResponse = {
  id: string;
  messages?: { data?: Array<Record<string, any>>; paging?: { next?: string; previous?: string } };
};

export async function getInstagramConversations(igUserId: string, accessToken: string) {
  return instagramApiRequest<InstagramConversationListResponse>(`/${encodeURIComponent(igUserId)}/conversations?platform=instagram`, accessToken);
}

export async function getInstagramConversationMessages(conversationId: string, accessToken: string, after?: string) {
  const params = new URLSearchParams({ fields: 'messages{id,from,to,message,created_time,attachments,reply_to}' });
  if (after) params.set('after', after);
  return instagramApiRequest<InstagramConversationMessagesResponse>(`/${encodeURIComponent(conversationId)}?${params}`, accessToken);
}

type AccessTokenResponse = { access_token: string; user_id: number; permissions?: string };
type LongLivedTokenResponse = { access_token: string; token_type: string; expires_in: number };
type UserProfile = { user_id: string; username: string };

export async function exchangeCodeForToken(code: string, redirectUri?: string): Promise<AccessTokenResponse> {
  const params = new URLSearchParams({
    client_id: process.env.SOCIALS_INSTAGRAM_APP_ID!,
    client_secret: process.env.SOCIALS_INSTAGRAM_APP_SECRET!,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri ?? data.instagram.redirect_uri,
    code,
  });
  const response = await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body: params, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error_message || 'Instagram OAuth token exchange failed.');
  return payload as AccessTokenResponse;
}

export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<LongLivedTokenResponse> {
  const params = new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: process.env.SOCIALS_INSTAGRAM_APP_SECRET!, access_token: shortLivedToken });
  return instagramApiRequest<LongLivedTokenResponse>(`/access_token?${params}`, '');
}

export async function getUserProfile(longLivedToken: string): Promise<UserProfile> {
  return instagramApiRequest<UserProfile>('/me?fields=user_id,username', longLivedToken);
}
