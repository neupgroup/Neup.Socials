
'use server';

import { dataStore } from '@/lib/data-store';
import { decrypt } from '@/lib/crypto';
import { getPosts } from '@/core/facebook/api';
import { logError } from '@/lib/error-logging';
import { subDays } from 'date-fns';

type SyncResult = {
  success: boolean;
  postsSynced: number;
  error?: string;
};

/**
 * Creates a log entry for a sync operation.
 * @param accountId The ID of the account being synced.
 * @param status The status of the sync ('Success', 'Failed').
 * @param details An object with details like postsSynced or errorMessage.
 */
async function createSyncLog(accountId: string, status: 'Success' | 'Failed', details: object) {
    try {
        await dataStore.syncLogs.create({
            accountId,
            status,
            syncedAt: new Date(),
            postsSynced: (details as { postsSynced?: number }).postsSynced,
            errorMessage: (details as { errorMessage?: string }).errorMessage,
            range: (details as { range?: unknown }).range,
            details,
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
 * Fetches posts from a Facebook Page and stores them in Firestore.
 * Implements an intelligent sync logic to avoid re-fetching all posts.
 * Can take optional since/until timestamps to fetch specific ranges.
 * @param accountId The Firestore document ID of the connected account.
 * @param options Optional object with since and until Unix timestamps.
 * @returns An object indicating success and the number of new posts synced.
 */
export async function syncPostsAction(accountId: string, options?: { since?: number, until?: number }): Promise<SyncResult> {
  try {
    const account = await dataStore.accounts.getById(accountId);

    if (!account) {
      throw new Error('Account not found.');
    }

    if (account.platform !== 'Facebook') {
      return { success: true, postsSynced: 0 }; // Not a FB page, nothing to sync.
    }
    if (!account.encryptedToken || !account.platformId) {
      throw new Error('Facebook account is missing required credentials.');
    }

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

    const feedResponse = await getPosts(pageId, pageToken, since, until);
    const fetchedPosts = feedResponse.data;

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

    const platformPostIds = fetchedPosts.map(p => p.id);
    const existingPosts = await dataStore.posts.findExistingPlatformPostIds(accountId, platformPostIds);
    const existingPostIds = new Set(existingPosts.map((post) => post.platformPostId).filter(Boolean) as string[]);

    const newPosts = fetchedPosts.filter(p => !existingPostIds.has(p.id));

    if (newPosts.length > 0) {
      await dataStore.posts.createMany(
        newPosts.map((post) => ({
          accountId: accountId,
          platform: 'Facebook',
          platformPostId: post.id,
          message: post.message || post.story || '',
          postLink: post.permalink_url,
          createdOn: new Date(post.created_time),
          createdBy: account.owner,
          logs: ['Synced from Facebook'],
        }))
      );
    }
    
    if (!options) {
      await dataStore.accounts.update(accountId, {
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    await createSyncLog(accountId, 'Success', {
      postsSynced: newPosts.length,
      range: {
        since: new Date(since * 1000).toISOString(),
        until: new Date(until * 1000).toISOString(),
      },
    });

    return { success: true, postsSynced: newPosts.length };
  } catch (error: any) {
    await logError({
      process: 'syncPostsAction',
      location: 'Sync Posts Action',
      errorMessage: error.message,
      context: { accountId },
    });
    await createSyncLog(accountId, 'Failed', { errorMessage: error.message });
    return { success: false, postsSynced: 0, error: error.message };
  }
}
