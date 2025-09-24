/**
 * @fileoverview Action to generate the Facebook OAuth URL.
 */
'use server';

import { generateRandomState } from '@/lib/crypto';

const FB_OAUTH_BASE_URL = 'https://www.facebook.com/v20.0/dialog/oauth';

/**
 * Generates the URL to redirect the user to for Facebook authentication.
 * @param userId - The ID of the user initiating the request.
 * @returns The full Facebook OAuth dialog URL.
 */
export function getFacebookAuthUrl(userId: string): string {
  // The state parameter is used for security purposes to prevent CSRF attacks.
  const state = generateRandomState(userId);

  const params = new URLSearchParams({
    client_id: process.env.FB_APP_ID!,
    redirect_uri: process.env.FB_REDIRECT_URI!,
    state,
    // These scopes request permissions to manage pages and read engagement.
    scope: 'pages_manage_posts,pages_read_engagement,pages_show_list,business_management,read_insights',
    response_type: 'code',
  });

  return `${FB_OAUTH_BASE_URL}?${params.toString()}`;
}
