'use server';

import { FacebookReactionType, getFacebookReactionSummary } from './reactions.shared';

export async function getReaction(postId: string, type: FacebookReactionType) {
  const response = await getFacebookReactionSummary(postId, type);
  return response.reactions?.summary?.total_count ?? 0;
}
