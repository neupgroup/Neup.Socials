
/**
 * @fileoverview Action to generate the Instagram OAuth URL.
 */
'use server';

import { generateRandomState } from '@/lib/crypto';
import { logError } from '@/lib/error-logging';

const INSTAGRAM_OAUTH_BASE_URL = 'https://api.instagram.com/oauth/authorize';

/**
 * Generates the URL to redirect the user to for Instagram authentication.
 * @param userId - The ID of the user initiating the request.
 * @returns The full Instagram OAuth dialog URL.
 */
export async function getInstagramAuthUrl(userId: string): Promise<string> {
  try {
    const state = await generateRandomState(userId);

    if (!process.env.INSTAGRAM_APP_ID) {
      throw new Error('Instagram App ID environment variable is not set.');
    }

    const params = new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID!,
      redirect_uri: 'https://khanalcwani.com/bridge/api/v1/auth/callback/instagram',
      scope: 'user_profile,user_media',
      response_type: 'code',
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
