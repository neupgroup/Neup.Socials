
'use server';

import { dataStore } from '@/lib/data-store';
import { decrypt } from '@/lib/crypto';
import { getLinkedInPosts } from '@/services/linkedin/api';
import { logError } from '@/lib/error-logging';

type SyncResult = {
  success: boolean;
  postsSynced: number;
  error?: string;
};

/**
 * Fetches posts from a LinkedIn member's profile and stores them in Firestore.
 * @param accountId The Firestore document ID of the connected account.
 * @returns An object indicating success and the number of new posts synced.
 */
export async function syncLinkedInPostsAction(accountId: string): Promise<SyncResult> {
  try {
    const account = await dataStore.accounts.getById(accountId);
    if (!account) {
      throw new Error('Account not found.');
    }

    if (account.platform !== 'LinkedIn') {
      return { success: true, postsSynced: 0 }; // Not a LinkedIn account.
    }
    if (!account.encryptedToken || !account.platformId) {
      throw new Error('LinkedIn account is missing required credentials.');
    }

    const accessToken = await decrypt(account.encryptedToken);
    const authorUrn = `urn:li:person:${account.platformId}`;

    const feedResponse = await getLinkedInPosts(accessToken, authorUrn);
    const fetchedPosts = feedResponse.elements;

    if (!fetchedPosts || fetchedPosts.length === 0) {
      await dataStore.accounts.update(accountId, {
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      });

      await dataStore.syncLogEntries.create({
        type: 'posts',
        platform: 'linkedin',
        forProfile: accountId,
        moreInfo: {
          status: 'Success',
          postsSynced: 0,
          source: 'syncLinkedInPostsAction',
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
          platform: 'LinkedIn',
          platformPostId: post.id,
          message: post.commentary || '',
          postLink: `https://www.linkedin.com/feed/update/${post.id}/`,
          createdOn: new Date(post.createdAt),
          createdBy: account.owner,
          logs: ['Synced from LinkedIn'],
        }))
      );
    }
    
    await dataStore.accounts.update(accountId, {
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    });

    await dataStore.syncLogEntries.create({
      type: 'posts',
      platform: 'linkedin',
      forProfile: accountId,
      moreInfo: {
        status: 'Success',
        postsSynced: newPosts.length,
        fetchedPosts: fetchedPosts.length,
        source: 'syncLinkedInPostsAction',
      },
    });

    return { success: true, postsSynced: newPosts.length };
  } catch (error: any) {
    await dataStore.syncLogEntries.create({
      type: 'info',
      platform: 'linkedin',
      forProfile: accountId,
      moreInfo: {
        status: 'Failed',
        operation: 'posts',
        errorMessage: error.message,
        source: 'syncLinkedInPostsAction',
      },
    });

    await logError({
      process: 'syncLinkedInPostsAction',
      location: 'Sync Posts Action',
      errorMessage: error.message,
      context: { accountId },
    });
    return { success: false, postsSynced: 0, error: error.message };
  }
}
