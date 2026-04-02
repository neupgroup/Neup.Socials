
/**
 * @fileoverview Action to generate the Instagram business login URL.
 */
'use server';

import { generateRandomState } from '@/lib/crypto';
import { logError } from '@/lib/error-logging';
import { getAppBaseUrl, buildUrlFromBase } from '@/lib/app-url';

const INSTAGRAM_OAUTH_BASE_URL = 'https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=2563657770663564&redirect_uri=https://neupgroup.com/socials/bridge/callback.v1/auth.instagram&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights';
const INSTAGRAM_AUTH_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
  'instagram_business_manage_comments',
  'instagram_business_content_publish',
  'instagram_business_manage_insights',
].join(',');

/**
 * Generates the URL to redirect the user to for Instagram business authentication.
 *
 * Uses the Instagram OAuth authorize URL shape provided for the application.
 *
 * @param userId - The ID of the user initiating the request.
 * @returns The full Instagram OAuth dialog URL.
 */
export async function getInstagramAuthUrl(userId: string): Promise<string> {
  try {
    const state = await generateRandomState(userId);

    if (!process.env.INSTAGRAM_APP_ID) {
      throw new Error('Instagram App ID environment variable is not set.');
    }

    const redirectUri = buildUrlFromBase(
      getAppBaseUrl(),
      '/bridge/callback.v1/auth.instagram'
    );

    const params = new URLSearchParams({
      force_reauth: 'true',
      client_id: process.env.INSTAGRAM_APP_ID!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: INSTAGRAM_AUTH_SCOPES,
      state: encodeURIComponent(state),
    });

    return `${INSTAGRAM_OAUTH_BASE_URL}?${params.toString()}`;
  } catch (error: any) {
    await logError({
      process: 'Generate Instagram Auth URL',
      location: 'getInstagramAuthUrl',
      user: userId,
      errorMessage: error.message,
      context: error,
    });
    throw error;
  }
}
