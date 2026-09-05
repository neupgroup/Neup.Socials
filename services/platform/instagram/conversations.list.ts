'use server';

import { logError } from '@/services/error-logging';

const INSTAGRAM_GRAPH_API_VERSION = 'v23.0';
const INSTAGRAM_GRAPH_API_BASE_URL = `https://graph.instagram.com/${INSTAGRAM_GRAPH_API_VERSION}`;

export type InstagramConversation = {
  id: string;
  updated_time: string;
};

export type InstagramConversationsResponse = {
  data: InstagramConversation[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
};

type InstagramApiErrorResponse = {
  error?: {
    message?: string;
  };
};

export async function getInstagramConversations({
  igUserId,
  accessToken,
  after,
  limit,
}: {
  igUserId: string;
  accessToken: string;
  after?: string;
  limit?: number;
}): Promise<InstagramConversationsResponse> {
  if (!igUserId.trim()) {
    throw new Error('Instagram user ID is required.');
  }

  if (!accessToken.trim()) {
    throw new Error('Instagram access token is required.');
  }

  const params = new URLSearchParams({
    platform: 'instagram',
  });

  if (after?.trim()) params.set('after', after.trim());
  if (limit !== undefined && Number.isInteger(limit) && limit > 0) {
    params.set('limit', String(limit));
  }

  try {
    const response = await fetch(
      `${INSTAGRAM_GRAPH_API_BASE_URL}/${encodeURIComponent(igUserId)}/conversations?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const payload = (await response.json().catch(() => null)) as
      | InstagramConversationsResponse
      | InstagramApiErrorResponse
      | null;

    console.log('[Instagram conversations] response', {
      igUserId,
      status: response.status,
      ok: response.ok,
      payload,
    });

    if (!response.ok) {
      throw new Error(
        (payload as InstagramApiErrorResponse | null)?.error?.message ||
          'Instagram conversations request failed.',
      );
    }

    if (!payload || !Array.isArray((payload as InstagramConversationsResponse).data)) {
      throw new Error('Instagram returned an invalid conversations response.');
    }

    return payload as InstagramConversationsResponse;
  } catch (error) {
    console.error('[Instagram conversations] error', {
      igUserId,
      error: error instanceof Error ? error.message : String(error),
    });
    await logError({
      process: 'getInstagramConversations',
      location: 'Instagram Graph API /conversations',
      errorMessage: error instanceof Error ? error.message : String(error),
      context: { igUserId },
    });
    throw error;
  }
}
