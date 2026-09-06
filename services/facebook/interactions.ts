'use server';

import { dataStore } from '@/services/repositories';
import { getReactors } from './getReactors';

export type InteractionItem = {
  id: string;
  name: string;
  image?: string;
  type: 'comment' | 'reaction';
  detail: string;
  postId?: string;
  occurredAt: string;
};

export async function getFacebookInteractions(limit = 100): Promise<InteractionItem[]> {
  const comments = await dataStore.postComments.listRecent({ take: limit });
  const posts = await dataStore.posts.list({ take: 20, searchFilter: { platform: 'Facebook' } });
  const items: InteractionItem[] = comments.map((comment: any) => {
    const commenter = comment.commenter && typeof comment.commenter === 'object' ? comment.commenter : {};
    return {
      id: `comment:${comment.id}`,
      name: commenter.name ?? 'Facebook user',
      image: commenter.image,
      type: 'comment',
      detail: comment.commentText ?? 'Commented on a post',
      postId: comment.postId,
      occurredAt: new Date(comment.commentedOn).toISOString(),
    };
  });

  const reactions = await Promise.all(posts.map(async (post: any) => {
    try {
      const reactors = await getReactors(post.id);
      return reactors.map((reactor) => ({
        id: `reaction:${post.id}:${reactor.id}`,
        name: reactor.name ?? 'Facebook user',
        image: reactor.picture?.data?.url,
        type: 'reaction' as const,
        detail: 'Reacted to a post',
        postId: post.id,
        occurredAt: new Date(post.createdOn).toISOString(),
      }));
    } catch {
      return [];
    }
  }));

  return [...items, ...reactions.flat()]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit);
}
