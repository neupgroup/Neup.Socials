'use server';

import crypto from 'crypto';
import { generateRandomState } from '@neup/core/helpers/crypto';
import { getEnvVariable } from '@neup/core/helpers/env';
import data from '@base/data.json';

/**
 * Reads the TikTok app credentials from environment variables.
 * @returns The TikTok client key, client secret, and organization ID.
 * @throws {Error} If any of `SOCIALS_TIKTOK_CLIENT_KEY`,
 * `SOCIALS_TIKTOK_CLIENT_SECRET`, or `SOCIALS_TIKTOK_ORGANIZATION_ID` is missing.
 */
export function getTikTokCredentials() {
  const clientKey = getEnvVariable('SOCIALS_TIKTOK_CLIENT_KEY');
  const clientSecret = getEnvVariable('SOCIALS_TIKTOK_CLIENT_SECRET');
  const organizationId = getEnvVariable('SOCIALS_TIKTOK_ORGANIZATION_ID');

  if (!clientKey || !clientSecret || !organizationId) {
    throw new Error('TikTok client key, client secret, and organization ID environment variables are required.');
  }

  return { clientKey, clientSecret, organizationId };
}

/**
 * Builds the TikTok OAuth 2.0 authorization URL using the PKCE (S256) flow.
 *
 * A random `codeVerifier` is generated and its SHA-256 challenge is sent to
 * TikTok. The verifier and organization ID are packed, together with the base
 * state from `generateRandomState`, into a base64url-encoded `state` value.
 *
 * Requested scopes: `user.info.profile`, `user.info.stats`, `video.list`.
 *
 * @param userId - ID of the user starting the connection; used to generate the OAuth state.
 * @returns The full URL to redirect the user to for TikTok authorization.
 * @throws {Error} If the TikTok credentials are not configured.
 */
export async function getTikTokAuthUrl(userId: string): Promise<string> {
  const { clientKey, organizationId } = getTikTokCredentials();

  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const baseState = await generateRandomState(userId);
  const stateData = JSON.parse(Buffer.from(baseState, 'base64').toString('utf8'));
  const state = Buffer.from(JSON.stringify({ ...stateData, codeVerifier, organizationId })).toString('base64url');

  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: 'code',
    scope: 'user.info.profile,user.info.stats,video.list',
    redirect_uri: data.tiktok.redirect_uri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${data.tiktok.oauth_url}?${params.toString()}`;
}
