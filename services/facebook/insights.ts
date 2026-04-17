/**
 * @fileoverview Server actions for fetching Facebook Page insights.
 */
'use server';

import { dataStore } from '@/core/lib/data-store';
import { decrypt } from '@/core/lib/crypto';
import { getPageInsights, InsightValue, PageInsightsQueryContext } from '@/services/facebook/api';
import { subDays, format } from 'date-fns';
import { logError } from '@/core/lib/error-logging';

type ConnectedAccount = {
  id: string;
  platform: string;
  name: string;
};

type GetAccountsResult = {
  success: boolean;
  accounts?: ConnectedAccount[];
  error?: string;
};

type GetInsightsResult = {
  success: boolean;
  data?: {
    totalFollowers: number;
    totalEngagement: number;
    totalReach: number;
    followerHistory: InsightValue[];
    reactions: { [key: string]: number };
  };
  rawInsights?: Awaited<ReturnType<typeof getPageInsights>>;
  error?: string;
  requiresReauth?: boolean; // Flag to indicate if user needs to re-authenticate
};

type InsightsActionContext = {
  metrics?: string[];
  since?: string;
  until?: string;
  period?: PageInsightsQueryContext['period'];
  breakdown?: string;
  metricType?: string;
};

const sumNumericValues = (values: InsightValue[] | undefined) =>
  (values ?? []).reduce((sum, item) => {
    if (typeof item.value === 'number') {
      return sum + item.value;
    }
    return sum;
  }, 0);

const getLatestNumericValue = (values: InsightValue[] | undefined) => {
  if (!values || values.length === 0) {
    return 0;
  }

  const latest = values[values.length - 1]?.value;
  return typeof latest === 'number' ? latest : 0;
};

/**
 * Fetches all connected accounts for a given user.
 * @param ownerId The ID of the user.
 * @returns A list of connected accounts.
 */
export async function getConnectedAccounts(ownerId: string = 'neupkishor'): Promise<GetAccountsResult> {
  try {
    const accounts = await dataStore.accounts.list({ owner: ownerId, skip: 0, take: 100 });
    return {
      success: true,
      accounts: accounts.map((account) => ({
        id: account.id,
        platform: account.platform,
        name: account.name ?? account.username ?? account.platformId ?? account.id,
      })),
    };
  } catch (error: any) {
    await logError({
      process: 'getConnectedAccounts',
      location: 'Insights Action',
      errorMessage: error.message,
      user: ownerId,
    });
    return { success: false, error: 'Failed to fetch accounts.' };
  }
}

/**
 * Fetches key insights for a specific Facebook Page.
 * @param accountId The connected account record ID in the data store.
 * @returns An object containing key insights.
 */
export async function getPageInsightsAction(
  accountId: string,
  context?: InsightsActionContext
): Promise<GetInsightsResult> {
  try {
    const account = await dataStore.accounts.getById(accountId);

    if (!account) {
      throw new Error('Account not found.');
    }
    if (account.platform !== 'Facebook') {
      throw new Error('Insights can only be fetched for Facebook pages.');
    }
    if (!account.encryptedToken || !account.platformId) {
      throw new Error('Facebook account is missing required credentials.');
    }

    const pageToken = await decrypt(account.encryptedToken);
    const pageId = account.platformId;

    const today = new Date();
    const defaultSince = format(subDays(today, 30), 'yyyy-MM-dd');
    const defaultUntil = format(today, 'yyyy-MM-dd');

    const metrics =
      context?.metrics && context.metrics.length > 0
        ? context.metrics
        : ['page_fans', 'page_post_engagements', 'page_impressions_unique', 'page_actions_post_reactions_total'];

    const queryContext: PageInsightsQueryContext = {
      since: context?.since ?? defaultSince,
      until: context?.until ?? defaultUntil,
      period: context?.period,
      breakdown: context?.breakdown,
      metricType: context?.metricType,
    };

    const insights = await getPageInsights(pageId, pageToken, metrics, queryContext);

    const targetPeriod = context?.period ?? 'day';

    const followerMetric = insights.data.find(m => m.name === 'page_fans' && m.period === targetPeriod);
    const engagementMetric = insights.data.find(m => m.name === 'page_post_engagements' && m.period === targetPeriod);
    const reachMetric = insights.data.find(m => m.name === 'page_impressions_unique' && m.period === targetPeriod);
    const reactionsMetric = insights.data.find(m => m.name === 'page_actions_post_reactions_total');

    // The 'page_fans' metric gives the total count at the end of each day.
    const totalFollowers = getLatestNumericValue(followerMetric?.values);
    const followerHistory = followerMetric?.values || [];

    // For total engagement and reach, we sum the daily values over the period.
    const totalEngagement = sumNumericValues(engagementMetric?.values);
    const totalReach = sumNumericValues(reachMetric?.values);

    // The reactions metric provides a breakdown.
    const reactionValue = reactionsMetric?.values[0]?.value;
    const reactions =
      reactionValue && typeof reactionValue === 'object' && !Array.isArray(reactionValue)
        ? (reactionValue as { [key: string]: number })
        : {};


    return {
      success: true,
      data: {
        totalFollowers,
        totalEngagement,
        totalReach,
        followerHistory,
        reactions,
      },
      rawInsights: insights,
    };

  } catch (error: any) {
    // Check if the error is related to token expiration or invalidation
    const errorMessage = error.message || '';
    const isTokenExpired =
      errorMessage.includes('Error validating access token') ||
      errorMessage.includes('session has been invalidated') ||
      errorMessage.includes('OAuthException') ||
      errorMessage.includes('The user has not authorized application') ||
      errorMessage.includes('changed their password') ||
      errorMessage.includes('security reasons');

    await logError({
      process: 'getPageInsightsAction',
      location: 'Insights Action',
      errorMessage: error.message,
      context: { accountId, requestContext: context },
    });

    return {
      success: false,
      error: error.message,
      requiresReauth: isTokenExpired
    };
  }
}
