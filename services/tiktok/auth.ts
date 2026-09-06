'use server';

import crypto from 'crypto';
import { generateRandomState } from '#/core/helpers/crypto';
import { getEnvVariable } from '#/core/helpers/env';
import data from '$/data.json';

export function getTikTokCredentials() {
  const clientKey = getEnvVariable('SOCIALS_TIKTOK_CLIENT_KEY');
  const clientSecret = getEnvVariable('SOCIALS_TIKTOK_CLIENT_SECRET');
  const organizationId = getEnvVariable('SOCIALS_TIKTOK_ORGANIZATION_ID');

  if (!clientKey || !clientSecret || !organizationId) {
    throw new Error('TikTok client key, client secret, and organization ID environment variables are required.');
  }

  return { clientKey, clientSecret, organizationId };
}

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
