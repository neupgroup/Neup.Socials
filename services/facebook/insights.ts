/**
 * @fileoverview Server-side actions for retrieving and processing
 * Facebook Page insights and connected account information.
 *
 * Handles account retrieval, credential validation, access token
 * decryption, insights query configuration, metric aggregation,
 * and authentication-related error detection.
 *
 * Transforms Facebook Graph API insights into application-level
 * analytics structures suitable for reporting and dashboard features.
 *
 * @module services/facebook/insights
 */

'use server';

import { decrypt } from '@neup/core/helpers/crypto';
import { getPageInsights, InsightValue, PageInsightsQueryContext } from '@/services/facebook/api';
import { subDays, format } from 'date-fns';
import { logError } from '@/services/error-logging';
import { getFacebookInsightsAccount, listFacebookInsightsAccounts } from '@/services/facebook/insights-data';

/**
 * Represents a simplified connected social media account
 * used by the insights interface.
 */
type ConnectedAccount = {
  /** Internal identifier of the connected account. */
  id: string;

  /** Social media platform associated with the account. */
  platform: string;

  /** Resolved display name of the connected account. */
  name: string;
};

/**
 * Represents the result of a connected account retrieval operation.
 */
type GetAccountsResult = {
  /** Indicates whether account retrieval completed successfully. */
  success: boolean;

  /** Collection of normalized connected accounts, when available. */
  accounts?: ConnectedAccount[];

  /** Error message describing an unsuccessful retrieval operation. */
  error?: string;
};

/**
 * Represents the result of a Facebook Page insights retrieval operation.
 *
 * Contains normalized analytics, the original insights response,
 * and optional authentication-related error information.
 */
type GetInsightsResult = {
  /** Indicates whether insights retrieval completed successfully. */
  success: boolean;

  /** Normalized Facebook Page analytics. */
  data?: {
    /** Latest numeric value of the page_fans metric. */
    totalFollowers: number;

    /** Sum of numeric engagement values for the selected metric period. */
    totalEngagement: number;

    /** Sum of numeric reach values for the selected metric period. */
    totalReach: number;

    /** Historical values returned for the page_fans metric. */
    followerHistory: InsightValue[];

    /** Reaction breakdown indexed by reaction category. */
    reactions: { [key: string]: number };
  };

  /** Original insights response returned by the Facebook API service. */
  rawInsights?: Awaited<ReturnType<typeof getPageInsights>>;

  /** Error message describing an unsuccessful insights request. */
  error?: string;

  /** Indicates whether the detected error may require account reauthentication. */
  requiresReauth?: boolean; // Flag to indicate if user needs to re-authenticate
};

/**
 * Configuration options for a Facebook Page insights request.
 *
 * Allows callers to customize requested metrics, date ranges,
 * reporting periods, breakdowns, and metric types.
 */
type InsightsActionContext = {
  /**
   * Collection of Facebook insight metric names to request.
   * Default metrics are used when this collection is omitted or empty.
   */
  metrics?: string[];

  /** Start date or time boundary of the insights query. */
  since?: string;

  /** End date or time boundary of the insights query. */
  until?: string;

  /** Reporting period supported by the Page insights service. */
  period?: PageInsightsQueryContext['period'];

  /** Optional breakdown parameter for grouped metric results. */
  breakdown?: string;

  /** Optional metric type parameter supplied to the insights service. */
  metricType?: string;
};

/**
 * Calculates the sum of numeric values in an insights metric collection.
 *
 * Ignores entries whose values are not numbers, including structured
 * metric breakdowns and other non-numeric values.
 *
 * @param values - Collection of insight metric values to aggregate.
 *
 * @returns The sum of all numeric values, or 0 when no numeric
 * values are available.
 *
 * @remarks
 * Numeric values are aggregated as provided without additional
 * validation, deduplication, or period normalization.
 */
const sumNumericValues = (values: InsightValue[] | undefined) =>
  (values ?? []).reduce((sum, item) => {
    if (typeof item.value === 'number') {
      return sum + item.value;
    }
    return sum;
  }, 0);

/**
 * Retrieves the numeric value of the final entry in an insights collection.
 *
 * Assumes the supplied collection is already ordered according to
 * the expected reporting chronology.
 *
 * @param values - Collection of insight metric values.
 *
 * @returns The numeric value of the final entry, or 0 when the
 * collection is empty, undefined, or its final value is not numeric.
 *
 * @remarks
 * This function does not sort the collection or search preceding
 * entries when the final entry contains a non-numeric value.
 */
const getLatestNumericValue = (values: InsightValue[] | undefined) => {
  if (!values || values.length === 0) {
    return 0;
  }

  const latest = values[values.length - 1]?.value;
  return typeof latest === 'number' ? latest : 0;
};

/**
 * Retrieves and normalizes connected social media accounts
 * associated with the specified owner.
 *
 * Requests up to 100 connected accounts from the insights data service
 * and maps each record into a simplified account representation.
 *
 * Account display names are resolved using the following fallback order:
 * account name, username, platform identifier, and internal identifier.
 *
 * @param ownerId - Identifier of the owner whose accounts are requested.
 * Defaults to the owner identifier configured in the function signature.
 *
 * @returns A promise resolving to a structured result containing
 * the normalized connected accounts or an error message.
 *
 * @remarks
 * Account retrieval is not explicitly restricted to Facebook.
 * Additional pages beyond the configured retrieval limit are not fetched.
 *
 * Retrieval exceptions are recorded through the error-logging service.
 * Callers receive a generic error message when retrieval fails.
 *
 * @throws May reject if the error-logging operation itself fails.
 *
 * @see listFacebookInsightsAccounts
 */
export async function getConnectedAccounts(ownerId: string = 'neupkishor'): Promise<GetAccountsResult> {
  try {
    const accounts = await listFacebookInsightsAccounts(ownerId, 100);
    return {
      success: true,
      accounts: accounts.map((account: {
        id: string;
        platform: string;
        name: string | null;
        username: string | null;
        platformId: string | null;
      }) => ({
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
 * Retrieves and processes analytics for a connected Facebook Page.
 *
 * Resolves the connected account, validates its platform and required
 * credentials, and decrypts the stored Page Access Token.
 *
 * Constructs an insights query using caller-provided configuration
 * or default metrics and date boundaries, then delegates retrieval
 * to the Facebook Page insights API service.
 *
 * Aggregates the returned metrics into follower, engagement, reach,
 * reaction, and historical analytics.
 *
 * @param accountId - Internal database identifier of the connected account.
 * @param context - Optional configuration for the insights request.
 * @param context.metrics - Collection of metric names to request.
 * Defaults to page_fans, page_post_engagements, page_impressions_unique,
 * and page_actions_post_reactions_total.
 * @param context.since - Start boundary of the insights query.
 * Defaults to the date 30 days before the current date.
 * @param context.until - End boundary of the insights query.
 * Defaults to the current date.
 * @param context.period - Optional reporting period for the API request.
 * Defaults to day when selecting metrics from the returned response.
 * @param context.breakdown - Optional metric breakdown parameter.
 * @param context.metricType - Optional metric type parameter.
 *
 * @returns A promise resolving to a structured insights result containing
 * normalized analytics and the original insights response on success.
 * Returns an error message and a reauthentication indicator on failure.
 *
 * @remarks
 * Follower totals are derived from the final numeric page_fans value.
 * Engagement and reach totals are calculated by summing numeric
 * values from their respective metric collections.
 *
 * Summed reach values do not necessarily represent unique people
 * reached across the complete reporting period.
 *
 * Reaction breakdowns are extracted from the first value of the
 * page_actions_post_reactions_total metric.
 *
 * Missing metrics and unsupported value structures produce zero
 * values, empty collections, or empty reaction breakdowns.
 *
 * Custom metric requests still pass through the same fixed analytics
 * extraction logic.
 *
 * Authentication-related failures are identified through matching
 * known error message fragments rather than structured API error codes.
 *
 * @throws May reject if the error-logging operation itself fails.
 *
 * @see getPageInsights
 * @see sumNumericValues
 * @see getLatestNumericValue
 * @see getFacebookInsightsAccount
 */
export async function getPageInsightsAction(
  accountId: string,
  context?: InsightsActionContext
): Promise<GetInsightsResult> {
  try {
    const account = await getFacebookInsightsAccount(accountId);

    // Validate the connected account and its Facebook credentials.
    if (!account) {
      throw new Error('Account not found.');
    }
    if (account.platform !== 'Facebook') {
      throw new Error('Insights can only be fetched for Facebook pages.');
    }
    if (!account.encryptedToken || !account.platformId) {
      throw new Error('Facebook account is missing required credentials.');
    }

    // Decrypt the stored token for Facebook API authentication.
    const pageToken = await decrypt(account.encryptedToken);
    const pageId = account.platformId;

    // Establish default date boundaries for the insights request.
    const today = new Date();
    const defaultSince = format(subDays(today, 30), 'yyyy-MM-dd');
    const defaultUntil = format(today, 'yyyy-MM-dd');

    // Use custom metrics when supplied, otherwise request default metrics.
    const metrics =
      context?.metrics && context.metrics.length > 0
        ? context.metrics
        : ['page_fans', 'page_post_engagements', 'page_impressions_unique', 'page_actions_post_reactions_total'];

    // Construct the API query context using caller options and defaults.
    const queryContext: PageInsightsQueryContext = {
      since: context?.since ?? defaultSince,
      until: context?.until ?? defaultUntil,
      period: context?.period,
      breakdown: context?.breakdown,
      metricType: context?.metricType,
    };

    const insights = await getPageInsights(pageId, pageToken, metrics, queryContext);

    const targetPeriod = context?.period ?? 'day';

    // Resolve the metrics required by the normalized analytics structure.
    const followerMetric = insights.data.find(m => m.name === 'page_fans' && m.period === targetPeriod);
    const engagementMetric = insights.data.find(m => m.name === 'page_post_engagements' && m.period === targetPeriod);
    const reachMetric = insights.data.find(m => m.name === 'page_impressions_unique' && m.period === targetPeriod);
    const reactionsMetric = insights.data.find(m => m.name === 'page_actions_post_reactions_total');

    // Use the final reported page_fans value rather than summing historical values.
    const totalFollowers = getLatestNumericValue(followerMetric?.values);
    const followerHistory = followerMetric?.values || [];

    // Aggregate numeric engagement and reach values across the returned periods.
    const totalEngagement = sumNumericValues(engagementMetric?.values);
    const totalReach = sumNumericValues(reachMetric?.values);

    // Extract the first reaction breakdown when represented as an object.
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
    // Identify potential token expiration, invalidation, or authorization failures.
    const errorMessage = error.message || '';
    const isTokenExpired =
      errorMessage.includes('Error validating access token') ||
      errorMessage.includes('session has been invalidated') ||
      errorMessage.includes('OAuthException') ||
      errorMessage.includes('The user has not authorized application') ||
      errorMessage.includes('changed their password') ||
      errorMessage.includes('security reasons');

    // Record the failed insights request and its associated query context.
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
