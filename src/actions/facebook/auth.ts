/**
 * @fileoverview Action to generate the Facebook OAuth URL.
 */
'use server';

import { generateRandomState } from '@/lib/crypto';
import { logError } from '@/lib/error-logging';

const FB_OAUTH_BASE_URL = 'https://www.facebook.com/v20.0/dialog/oauth';

/**
 * Generates the URL to redirect the user to for Facebook authentication.
 * @param userId - The ID of the user initiating the request.
 * @returns The full Facebook OAuth dialog URL.
 */
export async function getFacebookAuthUrl(userId: string): Promise<string> {
  try {
    // The state parameter is used for security purposes to prevent CSRF attacks.
    const state = await generateRandomState(userId);

    if (!process.env.FB_APP_ID || !process.env.FB_REDIRECT_URI) {
      throw new Error('Facebook environment variables are not set.');
    }

    const params = new URLSearchParams({
      client_id: process.env.FB_APP_ID!,
      redirect_uri: process.env.FB_REDIRECT_URI!,
      state,
      // These scopes request permissions to manage pages and read engagement.
      scope: 'pages_manage_posts,pages_read_engagement,pages_show_list,business_management,read_insights',
      response_type: 'code',
    });

    return `${FB_OAUTH_BASE_URL}?${params.toString()}`;
  } catch (error: any) {
    await logError({
      process: 'Generate Facebook Auth URL',
      location: 'getFacebookAuthUrl',
      user: userId,
      errorMessage: error.message,
      context: error,
    });
    // Re-throw the error to be caught by the calling function
    throw error;
  }
}
