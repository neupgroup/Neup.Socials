'use server';

import { getAllFacebookReactions } from './reactions.shared';

export async function getLikers(postId: string) {
  return getAllFacebookReactions(postId, 'LIKE');
}
