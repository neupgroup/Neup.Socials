/**
 * @fileoverview Server-side service for synchronizing Facebook Page posts
 * with the application's data store.
 *
 * Handles connected account validation, access token decryption,
 * synchronization date range calculation, Facebook post retrieval,
 * duplicate detection, missing media recovery, bulk post persistence,
 * and synchronization logging.
 *
 * Supports initial synchronization, incremental synchronization,
 * and synchronization using explicitly supplied date ranges.
 *
 * @module services/facebook/sync-posts
 */

'use server';

import { dataStore } from '@/services/repositories';
import { decrypt } from '@neup/core/helpers/crypto';
import { getPosts } from '@/services/facebook/api';
import { logError } from '@/services/error-logging';
import { subDays } from 'date-fns';

/**
 * Represents the result of a Facebook post synchronization operation.
 */
type SyncResult = {
  /** Indicates whether the synchronization completed successfully. */
  success: boolean;

  /**
   * Number of new posts reported as synchronized.
   *
   * Does not include existing posts updated with missing media.
   */
  postsSynced: number;

  /** Error message describing an unsuccessful synchronization operation. */
  error?: string;
};

/**
 * Creates synchronization log records for a Facebook post synchronization
 * operation.
 *
 * Persists synchronization information through both the syncLogs and
 * syncLogEntries repositories, including operation status, account
 * association, synchronization timestamp, date range, and additional
 * operation details.
 *
 * Converts available date range boundaries into Date objects for
 * structured synchronization log entries.
 *
 * @param accountId - Internal identifier of the connected account
 * associated with the synchronization operation.
 * @param status - Outcome of the synchronization operation.
 * Accepts 'Success' or 'Failed'.
 * @param details - Additional synchronization metadata, which may include
 * the number of synchronized posts, an error message, and date range
 * boundaries represented as strings.
 *
 * @returns A promise that resolves when the logging operation completes
 * or its failure has been handled.
 *
 * @remarks
 * Successful operations are classified as 'posts' entries, while
 * unsuccessful operations are classified as 'info' entries in the
 * syncLogEntries repository.
 *
 * Missing date range boundaries are stored as null.
 *
 * The supplied details object is accessed through TypeScript assertions
 * without runtime schema validation.
 *
 * Logging failures are reported to the console and delegated to the
 * application's centralized error-logging service.
 *
 * The two synchronization log writes are not enclosed within an explicit
 * database transaction. One log record may therefore be persisted even
 * when the subsequent write fails.
 *
 * @throws May reject if the centralized error-logging operation fails
 * while handling a synchronization logging error.
 *
 * @see logError
 */
async function createSyncLog(accountId: string, status: 'Success' | 'Failed', details: object) {
    try {
        // Persist the primary synchronization log record.
        await dataStore.syncLogs.create({
            accountId,
            status,
            syncedAt: new Date(),
            postsSynced: (details as { postsSynced?: number }).postsSynced,
            errorMessage: (details as { errorMessage?: string }).errorMessage,
            range: (details as { range?: unknown }).range,
            details,
        });

        // Resolve optional synchronization range boundaries.
        const range =
          (details as { range?: { since?: string; until?: string } }).range ?? undefined;
        const sinceTime = range?.since ? new Date(range.since) : null;
        const toTime = range?.until ? new Date(range.until) : null;

        // Persist the corresponding structured synchronization log entry.
        await dataStore.syncLogEntries.create({
          type: status === 'Success' ? 'posts' : 'info',
          platform: 'facebook',
          forProfile: accountId,
          sinceTime,
          toTime,
          moreInfo: {
            status,
            ...(details as Record<string, unknown>),
            source: 'syncPostsAction',
          },
        });
    } catch(error: any) {
        console.error("Failed to create sync log:", error);
        await logError({
            process: 'createSyncLog',
            location: 'Sync Posts Action',
            errorMessage: 'Could not write to sync_logs collection.',
            context: { originalDetails: details, loggingError: error.message }
        });
    }
}


/**
 * Synchronizes Facebook Page posts with the application's data store.
 *
 * Retrieves the connected account, validates its Facebook association
 * and required credentials, decrypts its stored Page Access Token,
 * and determines the date range used for post retrieval.
 *
 * Compares retrieved Facebook post identifiers against existing
 * application records to avoid inserting previously synchronized posts.
 *
 * Existing posts without stored media URLs are supplemented with the
 * available Facebook full_picture URL. Newly discovered posts are
 * transformed into the application's post structure and persisted
 * through a bulk creation operation.
 *
 * @param accountId - Internal database identifier of the connected
 * Facebook account.
 * @param options - Optional configuration defining a custom
 * synchronization date range.
 * @param options.since - Start boundary expressed as a Unix timestamp
 * in seconds.
 * @param options.until - End boundary expressed as a Unix timestamp
 * in seconds.
 *
 * @returns A promise resolving to a structured synchronization result
 * containing the operation status and the number of newly discovered
 * posts processed by the bulk creation operation.
 *
 * Returns an unsuccessful result containing an error message when
 * an exception occurs and error handling completes successfully.
 *
 * @remarks
 * Synchronization date ranges are determined as follows:
 *
 * - Custom synchronization: Uses the supplied since and until timestamps
 *   when both values are truthy.
 * - Incremental synchronization: Retrieves posts from five days before
 *   the account's last synchronization timestamp until the current time.
 * - Initial synchronization: Retrieves posts from the previous 90 days
 *   until the current time.
 *
 * The five-day overlap in incremental synchronization allows previously
 * missed posts to be retrieved while existing post identifiers are used
 * to prevent unnecessary duplicate insertion.
 *
 * When only one custom date boundary is supplied, the default
 * synchronization date range calculation is used.
 *
 * Accounts belonging to platforms other than Facebook are treated
 * as successful no-operation synchronizations.
 *
 * Existing posts are not fully refreshed. Only missing media URLs
 * are supplemented when a full_picture value is available.
 *
 * Newly created posts include their Facebook identifier, associated
 * account, message content, permanent link, media URL, creation
 * timestamp, owner, and available engagement statistics.
 *
 * The analytics.likes property receives the unfiltered reaction
 * summary count rather than an explicitly filtered LIKE count.
 *
 * The postsSynced property counts newly discovered posts and does
 * not include existing posts updated during synchronization.
 *
 * Account synchronization timestamps are updated when no posts
 * are returned, regardless of whether custom options are supplied.
 * For non-empty responses, timestamps are updated only when the
 * options argument is omitted.
 *
 * Successful and unsuccessful operations are recorded through
 * the synchronization logging service.
 *
 * Pagination behavior depends on the implementation of getPosts,
 * as this action processes only the returned data collection.
 *
 * Database writes are not enclosed within an explicit transaction.
 * An unsuccessful result does not guarantee that no changes
 * were persisted before the failure occurred.
 *
 * Account ownership, access token validity, and date range ordering
 * are not independently verified within this action.
 *
 * @throws May reject if error logging or synchronization failure
 * logging throws while handling an exception.
 *
 * @see getPosts
 * @see createSyncLog
 * @see SyncResult
 */
export async function syncPostsAction(accountId: string, options?: { since?: number, until?: number }): Promise<SyncResult> {
  try {
    const account = await dataStore.accounts.getById(accountId);

    // Validate the connected account and its required Facebook credentials.
    if (!account) {
      throw new Error('Account not found.');
    }

    if (account.platform !== 'Facebook') {
      return { success: true, postsSynced: 0 }; // Not a FB page, nothing to sync.
    }
    if (!account.encryptedToken || !account.platformId) {
      throw new Error('Facebook account is missing required credentials.');
    }

    // Decrypt the stored Page Access Token for Facebook API authentication.
    const pageToken = await decrypt(account.encryptedToken);
    const pageId = account.platformId;

    let since: number;
    let until: number;

    if (options?.since && options?.until) {
        // Use provided date range
        since = options.since;
        until = options.until;
    } else {
        // Default "intelligent sync" logic
        const now = new Date();
        const lastSynced = account.lastSyncedAt ?? null;
        if (lastSynced) {
            // Subsequent sync: fetch from a few days before the last sync to catch any missed posts.
            since = Math.floor(subDays(lastSynced, 5).getTime() / 1000);
        } else {
            // First sync: fetch posts from the last 90 days.
            since = Math.floor(subDays(now, 90).getTime() / 1000);
        }
        until = Math.floor(now.getTime() / 1000);
    }

    // Retrieve Facebook posts within the resolved synchronization range.
    const feedResponse = await getPosts(pageId, pageToken, since, until);
    const fetchedPosts = feedResponse.data;

    // Record a successful synchronization even when no posts are returned.
    if (!fetchedPosts || fetchedPosts.length === 0) {
      await dataStore.accounts.update(accountId, {
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      });
      await createSyncLog(accountId, 'Success', {
        postsSynced: 0,
        range: {
          since: new Date(since * 1000).toISOString(),
          until: new Date(until * 1000).toISOString(),
        },
      });
      return { success: true, postsSynced: 0 };
    }

    // Identify previously synchronized posts belonging to the selected account.
    const platformPostIds = fetchedPosts.map(p => p.id);
    const existingPosts = await dataStore.posts.findExistingPlatformPostIds(accountId, platformPostIds);

    // Build a set of existing Facebook post identifiers for duplicate detection.
    const existingPostIds = new Set<string>(
      existingPosts
        .map((post: { platformPostId: string | null }) => post.platformPostId)
        .filter((id: string | null): id is string => Boolean(id))
    );

    // Index existing posts by their external Facebook identifiers
    // to support efficient lookup and missing media recovery.
    const existingPostsByPlatformId = new Map<
      string,
      { id: string; platformPostId: string | null; mediaUrls: string[] }
    >(
      existingPosts
        .filter(
          (post: { id: string; platformPostId: string | null; mediaUrls: string[] }) =>
            Boolean(post.platformPostId)
        )
        .map(
          (post: { id: string; platformPostId: string | null; mediaUrls: string[] }) =>
            [post.platformPostId as string, post]
        )
    );

    // Supplement existing posts that have no stored media URLs.
    // Existing media collections are preserved without modification.
    for (const facebookPost of fetchedPosts) {
      const existingPost = existingPostsByPlatformId.get(facebookPost.id);

      if (
        existingPost &&
        (!existingPost.mediaUrls || existingPost.mediaUrls.length === 0) &&
        facebookPost.full_picture
      ) {
        await dataStore.posts.update(existingPost.id, {
          mediaUrls: [facebookPost.full_picture],
        });
      }
    }

    // Retain only posts whose platform identifiers are not already stored.
    const newPosts = fetchedPosts.filter((post) => !existingPostIds.has(post.id));


    // Normalize newly discovered Facebook posts and persist them in bulk.
    if (newPosts.length > 0) {
      await dataStore.posts.createMany(
        newPosts.map((post) => ({
          accountId: accountId,
          platform: 'Facebook',
          platformPostId: post.id,
          message: post.message || post.story || '',
          postLink: post.permalink_url,
          mediaUrls: post.full_picture ? [post.full_picture] : [],
          createdOn: new Date(post.created_time),
          createdBy: account.owner,
          analytics: {
            likes: post.reactions?.summary?.total_count ?? 0,
            comments: post.comments?.summary?.total_count ?? 0,
            shares: post.shares?.count ?? 0,
          },
          logs: ['Synced from Facebook'],
        }))
      );
    }

    // Advance the account synchronization timestamp only when
    // no options object was supplied for a non-empty response.
    if (!options) {
      await dataStore.accounts.update(accountId, {
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Record the successful synchronization and its effective date range.
    await createSyncLog(accountId, 'Success', {
      postsSynced: newPosts.length,
      range: {
        since: new Date(since * 1000).toISOString(),
        until: new Date(until * 1000).toISOString(),
      },
    });

    return { success: true, postsSynced: newPosts.length };
  } catch (error: any) {
    // Report the synchronization failure through centralized error logging.
    await logError({
      process: 'syncPostsAction',
      location: 'Sync Posts Action',
      errorMessage: error.message,
      context: { accountId },
    });

    // Persist the unsuccessful synchronization status for operational tracking.
    await createSyncLog(accountId, 'Failed', { errorMessage: error.message });
    return { success: false, postsSynced: 0, error: error.message };
  }
}