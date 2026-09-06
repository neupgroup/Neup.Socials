'use server';

import { getFacebookReactionSummary } from './reactions.shared';

export async function getLike(postId: string) {
  const response = await getFacebookReactionSummary(postId);
  return response.reactions?.summary?.total_count ?? 0;
}
