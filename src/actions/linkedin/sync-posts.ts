
'use server';

import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch, serverTimestamp, Timestamp, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { decrypt } from '@/lib/crypto';
import { getLinkedInPosts } from '@/core/linkedin/api';
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
  const accountDocRef = doc(db, 'connected_accounts', accountId);

  try {
    const accountSnap = await getDoc(accountDocRef);
    if (!accountSnap.exists()) {
      throw new Error('Account not found.');
    }
    const account = accountSnap.data();

    if (account.platform !== 'LinkedIn') {
      return { success: true, postsSynced: 0 }; // Not a LinkedIn account.
    }

    const accessToken = await decrypt(account.encryptedToken);
    const authorUrn = `urn:li:person:${account.platformId}`;

    const feedResponse = await getLinkedInPosts(accessToken, authorUrn);
    const fetchedPosts = feedResponse.elements;

    if (!fetchedPosts || fetchedPosts.length === 0) {
      await updateDoc(accountDocRef, { lastSyncedAt: serverTimestamp() });
      return { success: true, postsSynced: 0 };
    }

    const postsCollectionRef = collection(db, 'posts');
    const platformPostIds = fetchedPosts.map(p => p.id);
    
    const existingPostIds = new Set<string>();
    const chunks = [];
    for (let i = 0; i < platformPostIds.length; i += 30) {
        chunks.push(platformPostIds.slice(i, i + 30));
    }

    for (const chunk of chunks) {
        if (chunk.length === 0) continue;
        const q = query(postsCollectionRef, where('accountId', '==', accountId), where('platformPostId', 'in', chunk));
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => existingPostIds.add(doc.data().platformPostId));
    }

    const newPosts = fetchedPosts.filter(p => !existingPostIds.has(p.id));

    if (newPosts.length > 0) {
      const batch = writeBatch(db);
      newPosts.forEach(post => {
        const newPostRef = doc(collection(db, 'posts'));
        batch.set(newPostRef, {
          accountId: accountId,
          platform: 'LinkedIn',
          platformPostId: post.id,
          message: post.commentary || '',
          postLink: `https://www.linkedin.com/feed/update/${post.id}/`,
          createdOn: new Date(post.createdAt),
          createdBy: account.owner,
          logs: ['Synced from LinkedIn'],
        });
      });
      await batch.commit();
    }
    
    await updateDoc(accountDocRef, {
      lastSyncedAt: serverTimestamp(),
    });

    return { success: true, postsSynced: newPosts.length };
  } catch (error: any) {
    await logError({
      process: 'syncLinkedInPostsAction',
      location: 'Sync Posts Action',
      errorMessage: error.message,
      context: { accountId },
    });
    return { success: false, postsSynced: 0, error: error.message };
  }
}
