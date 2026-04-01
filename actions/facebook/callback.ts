
/**
 * @fileoverview Handles the OAuth callback from Facebook.
 */
'use server';

import {
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  getUserPages,
  subscribeAppToPageWebhooks,
} from '../../core/facebook/api';
import { FACEBOOK_AUTH_INTENTS, type FacebookAuthIntent } from './auth-intents';
import { validateState, encrypt } from '@/lib/crypto';
import { dataStore } from '@/lib/data-store';
import { logError } from '@/lib/error-logging';

function extractFacebookIntentsFromState(state: string): FacebookAuthIntent[] {
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    const intents = Array.isArray(decoded.facebookIntents) ? decoded.facebookIntents : [];
    const validIntents = new Set(FACEBOOK_AUTH_INTENTS);
    const selected = intents.filter((intent: string): intent is FacebookAuthIntent => validIntents.has(intent as FacebookAuthIntent));
    return selected.length > 0 ? selected : ['posts'];
  } catch {
    return ['posts'];
  }
}

/**
 * Handles the OAuth callback from Facebook. It exchanges the authorization code
 * for an access token, fetches the user's pages, and stores the page information
 * securely in Firestore.
 *
 * @param code - The authorization code provided by Facebook.
 * @param state - The state parameter for CSRF validation.
 * @returns An object indicating success or failure.
 */
export async function handleFacebookCallback(code: string, state: string) {
  let userId = 'anonymous';
  try {
    // 1. Validate the state parameter to prevent CSRF attacks.
    const validationResult = await validateState(state);
    userId = validationResult.userId;
    if (!userId) {
      throw new Error('State validation failed: No user ID present.');
    }
    const selectedIntents = extractFacebookIntentsFromState(state);

    // 2. Exchange the code for a short-lived user access token.
    const shortLivedTokenResponse = await exchangeCodeForShortLivedToken(code);

    // 3. Exchange the short-lived token for a long-lived one.
    const longLivedTokenResponse = await exchangeForLongLivedToken(
      shortLivedTokenResponse.access_token
    );
    const longLivedUserToken = longLivedTokenResponse.access_token;

    // 4. Fetch the user's pages using the long-lived user token.
    const pagesResponse = await getUserPages(longLivedUserToken);

    if (!pagesResponse.data || pagesResponse.data.length === 0) {
      return { success: false, error: 'No Facebook pages found for this user.' };
    }

    // 5. Store page details securely in Postgres for the user.
    for (const page of pagesResponse.data) {
      const encryptedToken = await encrypt(page.access_token);
      await dataStore.accounts.upsertByOwnerPlatformId({
        owner: userId,
        platform: 'Facebook',
        platformId: page.id,
        data: {
          name: page.name,
          username: page.name,
          encryptedToken,
          category: page.category,
          status: 'Active',
          updatedAt: new Date(),
          lastSyncedAt: null,
          metadata: {
            tasks: page.tasks ?? [],
            category: page.category ?? null,
            categoryList: page.category_list ?? [],
            authIntents: selectedIntents,
          },
        },
      });

      // Install app subscriptions for real-time Page webhook delivery.
      // feed covers post/comment changes; messages is only requested when user selected that intent.
      try {
        const subscribedFields = [
          'feed',
          ...(selectedIntents.includes('messages') ? ['messages'] : []),
        ];
        await subscribeAppToPageWebhooks(page.id, page.access_token, subscribedFields);
      } catch (subscriptionError: any) {
        await logError({
          process: 'subscribeAppToPageWebhooks',
          location: 'Facebook Callback Handler',
          errorMessage: subscriptionError?.message || 'Failed to subscribe app to Facebook page webhooks.',
          user: userId,
          context: {
            pageId: page.id,
            pageName: page.name,
            selectedIntents,
          },
        });
      }
    }

    return { success: true, message: `${pagesResponse.data.length} Facebook page(s) connected successfully.` };
  } catch (error: any) {
    console.error('Error in Facebook callback handler:', error);
    
    // Log the error using the new service
    await logError({
        process: 'handleFacebookCallback',
        location: 'Facebook Callback Handler',
        errorMessage: error.message,
        user: userId,
        context: {
            step: 'Facebook OAuth Callback Processing',
            state,
        },
    });
    
    return { success: false, error: error.message || 'An unknown error occurred during the Facebook callback.' };
  }
}
