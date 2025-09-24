
'use server';

import { doc, getDoc, updateDoc, serverTimestamp, collection, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { decrypt } from '@/lib/crypto';
import { logError } from '../error-logging';
import { publishToPage as publishToFacebookPage } from '@/core/facebook/api';

/**
 * Publishes a post to all its selected social media accounts.
 * @param postId The ID of the post document in Firestore.
 */
export async function publishContent(postId: string) {
  const postDocRef = doc(db, 'content', postId);
  let post;

  try {
    const postSnap = await getDoc(postDocRef);
    if (!postSnap.exists()) {
      throw new Error(`Post with ID ${postId} not found.`);
    }
    post = postSnap.data();

    if (!post.accountIds || post.accountIds.length === 0) {
      throw new Error(`Post ${postId} has no accounts selected for publishing.`);
    }

    const accountsCollection = collection(db, 'connected_accounts');
    const publicationPromises = post.accountIds.map(async (accountId: string) => {
      const accountDocRef = doc(accountsCollection, accountId);
      const accountSnap = await getDoc(accountDocRef);

      if (!accountSnap.exists()) {
        throw new Error(`Account with ID ${accountId} not found.`);
      }
      const account = accountSnap.data();
      const pageId = account.platformId;
      const encryptedToken = account.encryptedToken;
      
      let publicationResult = null;

      try {
        const token = await decrypt(encryptedToken);
        
        // Currently, we only support Facebook
        if (account.platform === 'Facebook') {
          const response = await publishToFacebookPage(pageId, token, post.content, post.mediaUrls, post.ctaType, post.ctaLink);
          const platformPostId = response.post_id || response.id;
          console.log(`Successfully published to Facebook page: ${account.name} (${pageId}). Post ID: ${platformPostId}`);
          publicationResult = {
              accountId,
              platform: 'Facebook',
              platformPostId,
              publishedAt: new Date().toISOString(),
          };
        } else {
           console.warn(`Publishing for platform '${account.platform}' is not yet implemented.`);
        }
        return publicationResult;
      } catch (error: any) {
        // Log an error for the specific account that failed
        await logError({
          source: 'publishContent - Account Publishing',
          message: `Failed to publish to ${account.platform} account: ${account.name}`,
          context: { postId, accountId, pageId, errorMessage: error.message },
          userId: account.owner,
        });
        // We throw here to make the Promise.all fail
        throw new Error(`Failed to publish to ${account.name}: ${error.message}`);
      }
    });

    // Wait for all publications to attempt
    const results = await Promise.all(publicationPromises);
    const successfulPublications = results.filter(r => r !== null);


    // Update the post status and add publication details
    await updateDoc(postDocRef, {
      status: 'Published',
      publishedAt: serverTimestamp(),
      scheduledAt: null,
      publicationDetails: arrayUnion(...successfulPublications),
    });

  } catch (error: any) {
    // Log the overarching error
    await logError({
      source: 'publishContent - Main',
      message: 'One or more publications failed.',
      context: { postId, error: error.message },
      userId: post?.author || 'unknown',
    });

    // We re-throw the error so the calling action can handle it
    throw error;
  }
}
