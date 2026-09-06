'use server';

import crypto from 'crypto';
import { generateRandomState } from '#/core/helpers/crypto';
import data from '$/data.json';

export async function getTikTokAuthUrl(userId: string): Promise<string> {
  const baseState = await generateRandomState(userId);
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const stateData = JSON.parse(Buffer.from(baseState, 'base64').toString('utf8'));
  const state = Buffer.from(JSON.stringify({ ...stateData, codeVerifier })).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const params = new URLSearchParams({
    client_key: data.tiktok.client_key,
    response_type: 'code',
    scope: 'user.info.profile,user.info.stats,video.list',
    redirect_uri: data.tiktok.redirect_uri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${data.tiktok.oauth_url}?${params.toString()}`;
}
