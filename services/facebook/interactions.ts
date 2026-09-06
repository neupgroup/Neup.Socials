'use server';

import { dataStore } from '@/services/repositories';
import { getLikers } from './getLikers';

export type InteractionItem = {
  id: string;
  name: string;
  image?: string;
  type: 'like' | 'comment' | 'message' | 'share';
  title: string;
  content: string;
  postId?: string;
  occurredAt: string;
};

export async function getFacebookInteractions(limit = 100): Promise<InteractionItem[]> {
  const comments = await dataStore.postComments.listRecent({ take: limit });
  const posts = await dataStore.posts.list({ take: 20, searchFilter: { platform: 'Facebook' } });
  const conversations = await dataStore.conversations.listRecent({ platform: 'Facebook', take: limit });
  const accounts = await dataStore.accounts.list({ searchFilter: { platform: 'Facebook' }, take: 100 });
  const pageNames = new Map(accounts.map((account: any) => [account.id, account.name ?? account.username ?? 'Facebook Page']));
  const postById = new Map<string, any>(posts.map((post: any) => [post.id, post] as [string, any]));
  const items: InteractionItem[] = comments.map((comment: any) => {
    const commenter = comment.commenter && typeof comment.commenter === 'object' ? comment.commenter : {};
    const post = postById.get(comment.postId);
    const pageName = pageNames.get(post?.accountId) ?? 'your Facebook Page';
    const commenterName = commenter.name ?? 'Facebook user';
    const isReply = Boolean(comment.parentCommentId || comment.parentId || commenter.isReply);
    return {
      id: `comment:${comment.id}`,
      name: commenterName,
      image: commenter.image,
      type: 'comment',
      title: isReply
        ? `${commenterName} replied on the comment by ${commenter.parentCommenterName ?? commenterName}.`
        : commenterName === pageName
          ? `${commenterName} commented on their own Facebook Post.`
          : `${commenterName} commented on ${pageName}'s post.`,
      content: comment.commentText ?? 'Commented on a post',
      postId: comment.postId,
      occurredAt: new Date(comment.commentedOn).toISOString(),
    };
  });

  const likes = await Promise.all(posts.map(async (post: any) => {
    try {
      const reactors = await getLikers(post.id);
      return reactors.map((reactor) => ({
        id: `like:${post.id}:${reactor.id}`,
        name: reactor.name ?? 'Facebook user',
        image: reactor.picture?.data?.url,
        type: 'like' as const,
        title: `${reactor.name ?? 'Someone'} liked ${pageNames.get(post.accountId) ?? 'your Facebook Page'}'s post.`,
        content: post.message || post.story || 'Facebook post',
        postId: post.id,
        occurredAt: new Date(post.createdOn).toISOString(),
      }));
    } catch {
      return [];
    }
  }));

  const messages: InteractionItem[] = conversations.map((conversation: any) => ({
    id: `message:${conversation.id}`,
    name: conversation.contactName ?? 'Facebook user',
    image: conversation.avatar,
    type: 'message',
    title: `${conversation.contactName ?? 'Someone'} messaged ${conversation.channelId ? (accounts.find((account: any) => account.platformId === conversation.channelId)?.name ?? 'your Facebook Page') : 'your Facebook Page'}.`,
    content: conversation.lastMessage ?? 'Sent a message',
    occurredAt: new Date(conversation.lastMessageAt ?? conversation.createdAt).toISOString(),
  }));

  const shares: InteractionItem[] = posts.flatMap((post: any) => {
    const count = Number(post.analytics?.shares ?? 0);
    return count > 0 ? [{
      id: `share:${post.id}`,
      name: `${count} people`,
      type: 'share' as const,
      title: `${count} share${count === 1 ? '' : 's'} on ${pageNames.get(post.accountId) ?? 'your Facebook Page'}'s post.`,
      content: post.message || post.story || 'Facebook post',
      postId: post.id,
      occurredAt: new Date(post.createdOn).toISOString(),
    }] : [];
  });

  return [...items, ...likes.flat(), ...messages, ...shares]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit);
}
