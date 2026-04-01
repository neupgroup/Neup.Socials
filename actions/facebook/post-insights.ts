/**
 * @fileoverview Server action for fetching Facebook Post insights.
 */
'use server';

import { dataStore } from '@/lib/data-store';
import { decrypt } from '@/lib/crypto';
import { getPagePostInsights } from '@/core/facebook/api';

const isFacebookPlatform = (platform: string | null | undefined) =>
  (platform ?? '').toLowerCase() === 'facebook';

type PostAnalytics = {
    likes: number;
    comments: number;
    shares: number;
};

type GetPostAnalyticsResult = {
  success: boolean;
  analytics?: PostAnalytics;
  error?: string;
};

/**
 * Fetches key insights for a specific Facebook Post.
 * @param postId The Post record ID in the data store.
 * @returns An object containing key post analytics.
 */
export async function getPostAnalyticsAction(postId: string): Promise<GetPostAnalyticsResult> {
  try {
    const postData = await dataStore.posts.getById(postId);

    if (!postData) {
      throw new Error('Post not found in data store.');
    }
    const { platformPostId, accountId } = postData;

    if (!platformPostId || !accountId) {
        throw new Error('Post data is incomplete.');
    }

    const accountData = await dataStore.accounts.getById(accountId);

    if (!accountData) {
      throw new Error('Associated account not found.');
    }

    if (!isFacebookPlatform(accountData.platform)) {
      return { success: true, analytics: { likes: 0, comments: 0, shares: 0 } }; // Not a FB post
    }
    if (!accountData.encryptedToken) {
      throw new Error('Associated Facebook account is missing credentials.');
    }

    const pageToken = await decrypt(accountData.encryptedToken);

    // These metrics are for lifetime of the post.
    const metrics = [
        'post_reactions_by_type_total', // This gives an object with all reaction types
        'post_activity_by_action_type', // This gives comments and shares
    ];
    
    const insights = await getPagePostInsights(platformPostId, pageToken, metrics);

    const reactionsMetric = insights.data.find(m => m.name === 'post_reactions_by_type_total');
    const activityMetric = insights.data.find(m => m.name === 'post_activity_by_action_type');

    let totalLikes = 0;
    if (reactionsMetric && reactionsMetric.values.length > 0) {
        const reactionValues = reactionsMetric.values[0].value as { [key: string]: number };
        if (reactionValues && reactionValues.like) {
             totalLikes = Object.values(reactionValues).reduce((sum, value) => sum + value, 0);
        }
    }
    
    let totalComments = 0;
    if(activityMetric && activityMetric.values.length > 0) {
        const activityValues = activityMetric.values[0].value as { [key: string]: number };
        if (activityValues && activityValues.comment) {
            totalComments = activityValues.comment;
        }
    }

    let totalShares = 0;
    if(activityMetric && activityMetric.values.length > 0) {
        const activityValues = activityMetric.values[0].value as { [key: string]: number };
        if (activityValues && activityValues.share) {
            totalShares = activityValues.share;
        }
    }


    return {
      success: true,
      analytics: {
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
      },
    };

  } catch (error: any) {
    // This can happen if insights are not ready yet, which is common.
    // We won't log this as a hard error to avoid noise.
    console.warn(`[getPostAnalyticsAction] Could not fetch insights for post ${postId}:`, error.message);
    return { success: false, error: error.message };
  }
}
