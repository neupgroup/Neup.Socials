
'use server';

import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch, serverTimestamp, Timestamp, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { decrypt } from '@/lib/crypto';
import { getPosts } from '@/core/facebook/api';
import { logError } from '@/lib/error-logging';
import { subDays, addDays, differenceInDays } from 'date-fns';

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
        await addDoc(collection(db, 'sync_logs'), {
            accountId,
            status,
            syncedAt: serverTimestamp(),
            ...details,
        });
    } catch(error: any) {
        // If logging fails, log the logging error itself to the main error log
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
  const accountDocRef = doc(db, 'connected_accounts', accountId);

  try {
    const accountSnap = await getDoc(accountDocRef);

    if (!accountSnap.exists()) {
      throw new Error('Account not found.');
    }
    const account = accountSnap.data();

    if (account.platform !== 'Facebook') {
      return { success: true, postsSynced: 0 }; // Not a FB page, nothing to sync.
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
        const lastSynced = account.lastSyncedAt ? account.lastSyncedAt.toDate() : null;
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
      await updateDoc(accountDocRef, { lastSyncedAt: serverTimestamp() });
      await createSyncLog(accountId, 'Success', { postsSynced: 0, range: { since: new Date(since * 1000), until: new Date(until * 1000) } });
      return { success: true, postsSynced: 0 };
    }

    const postsCollectionRef = collection(db, 'posts');
    const platformPostIds = fetchedPosts.map(p => p.id);

    // Chunk the platformPostIds array to respect Firestore's 30-item limit for 'in' queries
    const chunks = [];
    for (let i = 0; i < platformPostIds.length; i += 30) {
        chunks.push(platformPostIds.slice(i, i + 30));
    }
    
    const existingPostIds = new Set<string>();

    for (const chunk of chunks) {
        if (chunk.length === 0) continue;
        const existingPostsQuery = query(
            postsCollectionRef,
            where('accountId', '==', accountId),
            where('platformPostId', 'in', chunk)
        );
        const existingPostsSnap = await getDocs(existingPostsQuery);
        existingPostsSnap.docs.forEach(doc => existingPostIds.add(doc.data().platformPostId));
    }

    const newPosts = fetchedPosts.filter(p => !existingPostIds.has(p.id));

    if (newPosts.length > 0) {
      const batch = writeBatch(db);
      newPosts.forEach(post => {
        const newPostRef = doc(collection(db, 'posts'));
        batch.set(newPostRef, {
          accountId: accountId,
          platform: 'Facebook',
          platformPostId: post.id,
          message: post.message || post.story || '',
          postLink: post.permalink_url,
          createdOn: new Date(post.created_time),
          createdBy: account.owner, // Assume the account owner is the creator
          logs: ['Synced from Facebook'],
        });
      });
      await batch.commit();
    }
    
    // Update the last synced timestamp only on default syncs
    if (!options) {
      await updateDoc(accountDocRef, {
        lastSyncedAt: serverTimestamp(),
      });
    }
    
    await createSyncLog(accountId, 'Success', { postsSynced: newPosts.length, range: { since: new Date(since * 1000), until: new Date(until * 1000) } });

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
