
/**
 * @fileoverview Handles the OAuth callback from Instagram business login.
 */
'use server';

import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getUserProfile,
} from '../../services/instagram/api';
import { validateState, encrypt } from '@/core/lib/crypto';
import { dataStore } from '@/core/lib/data-store';
import { logError } from '@/core/lib/error-logging';
import { getAppBaseUrl, buildUrlFromBase } from '@/core/lib/app-url';

/**
 * Handles the OAuth callback from Instagram. It exchanges the authorization code
 * for a long-lived access token, fetches the user's professional-account
 * profile, and stores the information securely in Postgres.
 *
 * @param code - The authorization code provided by Instagram.
 * @param state - The state parameter for CSRF validation.
 * @returns An object indicating success or failure.
 */
export async function handleInstagramCallback(
  code: string,
  state: string
) {
  let userId = 'anonymous';
  try {
    // 1. Validate the state parameter to prevent CSRF attacks.
    const validationResult = await validateState(state);
    userId = validationResult.userId;
    if (!userId) {
      throw new Error('State validation failed: No user ID present.');
    }

    const redirectUri = buildUrlFromBase(
      getAppBaseUrl(),
      '/bridge/callback.v1/auth.meta'
    );

    // 2. Exchange the code for a short-lived user access token.
    const shortLivedTokenResponse = await exchangeCodeForToken(code, redirectUri);
    
    // 3. Exchange the short-lived token for a long-lived one.
    const longLivedTokenResponse = await exchangeForLongLivedToken(
      shortLivedTokenResponse.access_token
    );
    const longLivedToken = longLivedTokenResponse.access_token;
    
    // 4. Fetch the user's profile using the long-lived token.
    const userProfile = await getUserProfile(longLivedToken);

    // 5. Encrypt the token and store account details in Postgres.
    const encryptedToken = await encrypt(longLivedToken);

    await dataStore.accounts.upsertByOwnerPlatformId({
      owner: userId,
      platform: 'Instagram',
      platformId: userProfile.user_id,
      data: {
        name: userProfile.username,
        username: userProfile.username,
        encryptedToken,
        status: 'Active',
        updatedAt: new Date(),
        lastSyncedAt: null,
        metadata: {
          permissions: shortLivedTokenResponse.permissions ?? null,
          tokenType: longLivedTokenResponse.token_type,
          expiresIn: longLivedTokenResponse.expires_in,
          loginFlow: 'instagram_business_login',
        },
      },
    });

    return { success: true, message: `Instagram account @${userProfile.username} connected successfully.` };
  } catch (error: any) {
    console.error('Error in Instagram callback handler:', error);
    
    await logError({
        process: 'handleInstagramCallback',
        location: 'Instagram Callback Handler',
        errorMessage: error.message,
        user: userId,
        context: {
            step: 'Instagram OAuth Callback Processing',
            state,
        },
    });
    
    return { success: false, error: error.message || 'An unknown error occurred during the Instagram callback.' };
  }
}
