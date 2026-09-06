'use server';

import { getAllFacebookReactions } from './reactions.shared';

export async function getReactors(postId: string) {
  return getAllFacebookReactions(postId);
}
