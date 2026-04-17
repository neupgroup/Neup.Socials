
/**
 * @fileoverview Action to generate the LinkedIn OAuth URL.
 */
'use server';

import { generateRandomState } from '@/lib/crypto';
import { logError } from '@/lib/error-logging';

const LINKEDIN_OAUTH_BASE_URL = 'https://www.linkedin.com/oauth/v2/authorization';

/**
 * Generates the URL to redirect the user to for LinkedIn authentication.
 * @param userId - The ID of the user initiating the request.
 * @returns The full LinkedIn OAuth dialog URL.
 */
export async function getLinkedInAuthUrl(userId: string): Promise<string> {
  try {
    const state = await generateRandomState(userId);

    if (!process.env.LINKEDIN_CLIENT_ID) {
      throw new Error('LinkedIn Client ID environment variable is not set.');
    }

    // Scopes for OIDC login and posting on behalf of the user.
    const scope = 'openid profile w_member_social';

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      redirect_uri: 'https://khanalcwani.com/bridge/callback.v1/auth.linkedin',
      state: encodeURIComponent(state),
      scope,
    });

    return `${LINKEDIN_OAUTH_BASE_URL}?${params.toString()}`;
  } catch (error: any) {
    await logError({
      process: 'Generate LinkedIn Auth URL',
      location: 'getLinkedInAuthUrl',
      user: userId,
      errorMessage: error.message,
      context: error,
    });
    throw error;
  }
}
