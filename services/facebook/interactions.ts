/**
 * @fileoverview Server-side service for constructing a unified
 * Facebook interaction activity feed.
 *
 * Aggregates stored comments, Facebook post likes, Messenger conversation
 * summaries, and post-level share statistics into a standardized
 * collection of interaction items.
 *
 * Provides interaction descriptions, associated account information,
 * display metadata, timestamps, and chronological feed ordering.
 *
 * @module services/facebook/interaction
 */

'use server';

import { dataStore } from '@/services/repositories';
import { getLikers } from './getLikers';

/**
 * Represents a normalized social media interaction displayed
 * within the application activity feed.
 *
 * Supports individual comments, likes, conversation-based messages,
 * and aggregated post share statistics.
 */
export type InteractionItem = {
  /** Generated identifier distinguishing the interaction item. */
  id: string;

  /** Display name of the interacting user or aggregated audience. */
  name: string;

  /** Optional profile image or avatar URL. */
  image?: string;

  /** Classification of the social media interaction. */
  type: 'like' | 'comment' | 'message' | 'share';

  /** Human-readable description of the interaction. */
  title: string;

  /** Associated comment, message, or post content. */
  content: string;

  /** Internal identifier of the associated post, when applicable. */
  postId?: string;

  /**
   * ISO-formatted timestamp used for chronological feed ordering.
   *
   * Like and share interactions use the associated post creation
   * timestamp rather than the actual interaction timestamp.
   */
  occurredAt: string;
};

/**
 * Retrieves and constructs a unified Facebook interaction feed.
 *
 * Collects recent stored comments, Facebook posts, conversations,
 * and connected accounts from the application's data repositories.
 *
 * Retrieves LIKE reactions for the selected posts through the
 * Facebook reaction service and combines the retrieved data into
 * a common interaction representation.
 *
 * Generates descriptive activity titles using available commenter,
 * reactor, conversation contact, and Facebook Page information.
 *
 * @param limit - Maximum number of interaction items to return.
 * Also used as the retrieval limit for recent comments and conversations.
 * Defaults to 100.
 *
 * @returns A promise resolving to a combined collection of interaction
 * items, ordered by their assigned timestamps from newest to oldest
 * and truncated to the specified limit.
 *
 * @throws Propagates repository retrieval, data transformation,
 * date conversion, and other unexpected errors outside individual
 * reaction retrieval operations.
 *
 * @remarks
 * The interaction feed is assembled from the following sources:
 * - Recent stored comments, limited by the supplied limit.
 * - Up to 20 Facebook posts for like and share interactions.
 * - Recent Facebook conversations, limited by the supplied limit.
 * - Up to 100 connected Facebook accounts for Page name resolution.
 *
 * Comment reply classification is inferred from available parent
 * comment identifiers or stored commenter metadata.
 *
 * Conversation interactions represent conversation summaries rather
 * than individual message events.
 *
 * Like interactions are generated individually for retrieved reactors.
 * Share interactions are aggregated into one item per qualifying post.
 *
 * Both like and share interactions use the post creation timestamp
 * because individual interaction timestamps are not retrieved here.
 *
 * Reaction retrieval failures are suppressed independently for each
 * post, allowing other interaction sources to remain available.
 *
 * The recent comment query does not explicitly apply a Facebook
 * platform filter within this function.
 *
 * @see InteractionItem
 * @see getLikers
 */
export async function getFacebookInteractions(limit = 100): Promise<InteractionItem[]> {
  // Retrieve the source records required to construct the interaction feed.
  const comments = await dataStore.postComments.listRecent({ take: limit });
  const posts = await dataStore.posts.list({ take: 20, searchFilter: { platform: 'Facebook' } });
  const conversations = await dataStore.conversations.listRecent({ platform: 'Facebook', take: limit });
  const accounts = await dataStore.accounts.list({ searchFilter: { platform: 'Facebook' }, take: 100 });

  // Index account display names and posts for efficient association lookup.
  const pageNames = new Map(accounts.map((account: any) => [account.id, account.name ?? account.username ?? 'Facebook Page']));
  const postById = new Map<string, any>(posts.map((post: any) => [post.id, post] as [string, any]));

  // Normalize stored comments and derive context-specific activity titles.
  const items: InteractionItem[] = comments.map((comment: any) => {
    const commenter = comment.commenter && typeof comment.commenter === 'object' ? comment.commenter : {};
    const post = postById.get(comment.postId);
    const pageName = pageNames.get(post?.accountId) ?? 'your Facebook Page';
    const commenterName = commenter.name ?? 'Facebook user';

    // Infer reply classification from available parent comment metadata.
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

  // Retrieve LIKE reactions concurrently for the selected Facebook posts.
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
      // Exclude failed reaction lookups without interrupting the remaining feed.
      return [];
    }
  }));

  // Convert recent conversation summaries into message interaction items.
  const messages: InteractionItem[] = conversations.map((conversation: any) => ({
    id: `message:${conversation.id}`,
    name: conversation.contactName ?? 'Facebook user',
    image: conversation.avatar,
    type: 'message',
    title: `${conversation.contactName ?? 'Someone'} messaged ${conversation.channelId ? (accounts.find((account: any) => account.platformId === conversation.channelId)?.name ?? 'your Facebook Page') : 'your Facebook Page'}.`,
    content: conversation.lastMessage ?? 'Sent a message',
    occurredAt: new Date(conversation.lastMessageAt ?? conversation.createdAt).toISOString(),
  }));

  // Generate one aggregated share interaction for each post with shares.
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

  // Merge all interaction sources, sort chronologically, and limit the feed.
  return [...items, ...likes.flat(), ...messages, ...shares]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit);
}
