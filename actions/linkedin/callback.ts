
/**
 * @fileoverview Handles the OAuth callback from LinkedIn.
 */
'use server';

import { exchangeCodeForToken, getUserProfile } from '@/core/linkedin/api';
import { validateState, encrypt } from '@/lib/crypto';
import { dataStore } from '@/lib/data-store';
import { logError } from '@/lib/error-logging';

/**
 * Handles the OAuth callback from LinkedIn.
 * @param code - The authorization code provided by LinkedIn.
 * @param state - The state parameter for CSRF validation.
 * @returns An object indicating success or failure.
 */
export async function handleLinkedInCallback(code: string, state: string) {
  let userId = 'anonymous';
  try {
    const validationResult = await validateState(state);
    userId = validationResult.userId;
    if (!userId) {
      throw new Error('State validation failed: No user ID present.');
    }

    const tokenResponse = await exchangeCodeForToken(code);
    const accessToken = tokenResponse.access_token;
    
    const userProfile = await getUserProfile(accessToken);
    const fullName = userProfile.name;

    const encryptedToken = await encrypt(accessToken);

    await dataStore.accounts.upsertByOwnerPlatformId({
      owner: userId,
      platform: 'LinkedIn',
      platformId: userProfile.sub,
      data: {
        name: fullName,
        username: fullName,
        encryptedToken,
        status: 'Active',
        updatedAt: new Date(),
        lastSyncedAt: null,
      },
    });

    return { success: true, message: `LinkedIn account for ${fullName} connected successfully.` };
  } catch (error: any) {
    console.error('Error in LinkedIn callback handler:', error);
    
    await logError({
        process: 'handleLinkedInCallback',
        location: 'LinkedIn Callback Handler',
        errorMessage: error.message,
        user: userId,
        context: {
            step: 'LinkedIn OAuth Callback Processing',
            state,
        },
    });
    
    return { success: false, error: error.message || 'An unknown error occurred during the LinkedIn callback.' };
  }
}
