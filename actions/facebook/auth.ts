/**
 * @fileoverview Action to generate the Facebook OAuth URL.
 */
'use server';

import { generateRandomState } from '@/lib/crypto';
import { logError } from '@/lib/error-logging';
import { FACEBOOK_AUTH_INTENTS, type FacebookAuthIntent } from './auth-intents';

const FB_OAUTH_BASE_URL = 'https://www.facebook.com/v20.0/dialog/oauth';
const FACEBOOK_BASE_SCOPES = ['pages_show_list'];

function normalizeIntents(intents?: FacebookAuthIntent[]): FacebookAuthIntent[] {
  const valid = new Set(FACEBOOK_AUTH_INTENTS);
  const selected = (intents ?? ['posts']).filter((intent) => valid.has(intent));
  return selected.length > 0 ? Array.from(new Set(selected)) : ['posts'];
}

function scopesForIntents(intents: FacebookAuthIntent[]): string[] {
  const scopes = new Set<string>(FACEBOOK_BASE_SCOPES);

  // Required to install app subscriptions on the Page (/subscribed_apps).
  if (intents.length > 0) {
    scopes.add('pages_manage_metadata');
  }

  if (intents.includes('messages')) {
    // For Page conversations/messages APIs, Meta requires pages_messaging.
    scopes.add('pages_messaging');
    scopes.add('pages_read_engagement');
  }

  if (intents.includes('posts')) {
    scopes.add('pages_read_engagement');
    scopes.add('pages_manage_posts');
  }

  return Array.from(scopes);
}

/**
 * Generates the URL to redirect the user to for Facebook authentication.
 * @param userId - The ID of the user initiating the request.
 * @returns The full Facebook OAuth dialog URL.
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
