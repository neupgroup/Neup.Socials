/**
 * @fileoverview Action to generate the Facebook OAuth URL.
 * 
 * This implements Facebook Login for Business + Messenger Platform onboarding.
 * Based on Meta's current documentation (v25.0), this flow:
 * 1. Uses Facebook Login for Business (not plain Facebook Login)
 * 2. Requests Messenger Platform permissions (pages_messaging, pages_manage_metadata, etc.)
 * 3. Obtains Page access tokens for Messenger API integration
 * 4. Requires Advanced Access Approval from Meta for Messenger permissions
 * 
 * @see https://developers.facebook.com/docs/facebook-login
 * @see https://developers.facebook.com/docs/messages
 * @see https://developers.facebook.com/docs/pages-api
 */
'use server';

import { generateRandomState } from '@/lib/crypto';
import { logError } from '@/lib/error-logging';
import { FACEBOOK_AUTH_INTENTS, type FacebookAuthIntent } from './auth-intents';

const FB_OAUTH_BASE_URL = 'https://www.facebook.com/v25.0/dialog/oauth';
const FACEBOOK_BASE_SCOPES = ['pages_show_list'];

function normalizeIntents(intents?: FacebookAuthIntent[]): FacebookAuthIntent[] {
  const valid = new Set(FACEBOOK_AUTH_INTENTS);
  const selected = (intents ?? ['posts']).filter((intent) => valid.has(intent));
  return selected.length > 0 ? Array.from(new Set(selected)) : ['posts'];
}

function scopesForIntents(intents: FacebookAuthIntent[]): string[] {
  const scopes = new Set<string>(FACEBOOK_BASE_SCOPES);

  // pages_manage_metadata: Required for webhook subscriptions + Messenger onboarding.
  // This permission must be approved via Advanced Access in Meta App Dashboard.
  if (intents.length > 0) {
    scopes.add('pages_manage_metadata');
  }

  if (intents.includes('messages')) {
    // Messenger Platform permissions (v25.0):
    // - pages_messaging: Send/receive Page messages. Requires Advanced Access Approval.
    // - pages_read_engagement: Read conversation metadata and engagement data.
    // Both are required per Meta's current Messenger onboarding docs.
    scopes.add('pages_messaging');
    scopes.add('pages_read_engagement');
  }

  if (intents.includes('posts')) {
    // Feed/Posts management:
    // - pages_read_engagement: Read page posts and analytics.
    // - pages_manage_posts: Create and manage page posts.
    // - pages_manage_engagement: Moderate and manage comments. Requires Advanced Access Approval.
    scopes.add('pages_read_engagement');
    scopes.add('pages_manage_posts');
    scopes.add('pages_manage_engagement');
  }

  return Array.from(scopes);
}

/**
 * Generates the URL to redirect the user to for Facebook authentication.
 * 
 * ⚠️ IMPORTANT: For Messenger Platform permissions (pages_messaging, pages_manage_metadata)
 * to work, you must:
 * 1. Configure your Meta app with proper use case mapping (Messenger Platform)
 * 2. Have Advanced Access Approval from Meta for Messenger-related permissions
 * 3. Ensure users are added as admins/developers to your Meta app
 * 
 * Without these, Meta will silently ignore pages_messaging even though the scope name is valid.
 * 
 * @param userId - The ID of the user initiating the request.
 * @param intents - User intentions: 'messages' or 'posts' (or both).
 * @returns The full Facebook OAuth dialog URL (v25.0).
 */
export async function getFacebookAuthUrl(userId: string, intents?: FacebookAuthIntent[]): Promise<string> {
  try {
    const selectedIntents = normalizeIntents(intents);
    // The state parameter is used for security purposes to prevent CSRF attacks.
    const baseState = await generateRandomState(userId);
    const baseStateData = JSON.parse(Buffer.from(baseState, 'base64').toString('utf8'));
    const state = Buffer.from(
      JSON.stringify({
        ...baseStateData,
        facebookIntents: selectedIntents,
      })
    ).toString('base64');

    if (!process.env.FB_APP_ID) {
      throw new Error('Facebook App ID environment variable is not set.');
    }

    const scope = scopesForIntents(selectedIntents).join(',');

    const params = new URLSearchParams({
      client_id: process.env.FB_APP_ID!,
      redirect_uri: 'https://neupgroup.com/socials/bridge/callback.v1/auth.facebook',
      state: encodeURIComponent(state),
      scope,
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
