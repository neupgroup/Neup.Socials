'use server';

import { dataStore } from '@/services/repositories';
import { encrypt, validateState } from '#/core/helpers/crypto';
import { exchangeTikTokCode, getTikTokUser } from '@/services/tiktok/api';

export async function handleTikTokCallback(code: string, state: string) {
  const { userId } = await validateState(state);
  const stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf8')) as { codeVerifier?: string };
  const token = await exchangeTikTokCode(code, stateData.codeVerifier);
  const user = await getTikTokUser(token.access_token);
  const openId = user.open_id || token.open_id;

  await dataStore.accounts.upsertByOwnerPlatformId({
    owner: userId,
    platform: 'TikTok',
    platformId: openId,
    data: {
      name: user.display_name || user.username || openId,
      username: user.username || user.display_name || openId,
      encryptedToken: await encrypt(token.access_token),
      status: 'Active',
      updatedAt: new Date(),
      metadata: {
        provider: 'tiktok',
        refreshToken: await encrypt(token.refresh_token),
        expiresAt: new Date(Date.now() + token.expires_in * 1000).toISOString(),
        refreshExpiresAt: new Date(Date.now() + token.refresh_expires_in * 1000).toISOString(),
        scope: token.scope,
        tokenType: token.token_type,
        avatarUrl: user.avatar_url,
      },
    },
  });

  return { success: true, message: `TikTok account for ${user.display_name || user.username || openId} connected successfully.` };
}

