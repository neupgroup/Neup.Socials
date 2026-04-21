
/**
 * @fileoverview Action to generate the Instagram business login URL.
 */
'use server';

import { generateRandomState } from '@/core/lib/crypto';
import { logError } from '@/core/lib/error-logging';
import { getAppBaseUrl, buildUrlFromBase } from '@/core/lib/app-url';

const INSTAGRAM_OAUTH_BASE_URL = 'https://www.instagram.com/oauth/authorize';
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
    const baseState = await generateRandomState(userId);
    const baseStateData = JSON.parse(Buffer.from(baseState, 'base64').toString('utf8'));
    const state = Buffer.from(
      JSON.stringify({
        ...baseStateData,
        platform: 'Instagram',
      })
    ).toString('base64');

    if (!process.env.INSTAGRAM_APP_ID) {
      throw new Error('Instagram App ID environment variable is not set.');
    }

    const redirectUri = buildUrlFromBase(
      getAppBaseUrl(),
      '/bridge/callback.v1/auth.meta'
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
