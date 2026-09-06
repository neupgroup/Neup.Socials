import { dataStore } from '@/services/repositories';
import { decrypt } from '#/core/helpers/crypto';

export const FACEBOOK_GRAPH_API_VERSION = 'v26.0';
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}`;

export type FacebookReactionType = 'LIKE' | 'LOVE' | 'WOW' | 'HAHA' | 'SAD' | 'ANGRY';

export type FacebookReaction = {
  id: string;
  name?: string;
  picture?: { data?: { url?: string } };
};

type FacebookErrorResponse = { error?: { message?: string } };

export async function getFacebookPostContext(postId: string) {
  const post = await dataStore.posts.getById(postId);
  if (!post?.platformPostId || post.platform?.toLowerCase() !== 'facebook') {
    throw new Error('Post not found or not a Facebook post.');
  }

  const account = post.accountId ? await dataStore.accounts.getById(post.accountId) : null;
  if (!account?.encryptedToken) {
    throw new Error('Facebook account credentials were not found.');
  }

  return { platformPostId: post.platformPostId, accessToken: await decrypt(account.encryptedToken) };
}

export async function facebookRequest<T>(path: string, params: Record<string, string>) {
  const query = new URLSearchParams(params);
  const response = await fetch(`${GRAPH_API_BASE_URL}${path}?${query.toString()}`);
  const payload = (await response.json()) as T | FacebookErrorResponse;
  if (!response.ok) {
    throw new Error((payload as FacebookErrorResponse).error?.message ?? 'Facebook API request failed.');
  }
  return payload as T;
}

export async function getAllFacebookReactions(
  postId: string,
  type?: FacebookReactionType,
) {
  const { platformPostId, accessToken } = await getFacebookPostContext(postId);
  const reactions: FacebookReaction[] = [];
  let next: string | undefined = `/${platformPostId}/reactions`;
  let params: Record<string, string> = {
    access_token: accessToken,
    fields: 'id,name,picture',
    limit: '100',
  };
  if (type) params.type = type;

  while (next) {
    const payload = next.startsWith('http')
      ? await fetch(next).then(async (response) => {
          const json = await response.json();
          if (!response.ok) throw new Error((json as FacebookErrorResponse).error?.message ?? 'Facebook API request failed.');
          return json as { data?: FacebookReaction[]; paging?: { next?: string } };
        })
      : await facebookRequest<{ data?: FacebookReaction[]; paging?: { next?: string } }>(next, params);
    reactions.push(...(payload.data ?? []));
    next = payload.paging?.next;
    params = {};
  }

  return reactions;
}

export async function getFacebookReactionSummary(postId: string, type?: FacebookReactionType) {
  const { platformPostId, accessToken } = await getFacebookPostContext(postId);
  const reactionField = type ? `reactions.type(${type}).limit(0).summary(true)` : 'reactions.limit(0).summary(true)';
  return facebookRequest<{ reactions?: { summary?: { total_count?: number } } }>(`/${platformPostId}`, {
    access_token: accessToken,
    fields: reactionField,
  });
}
