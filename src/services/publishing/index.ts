
'use server';

import { doc, getDoc, updateDoc, serverTimestamp, collection, addDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { decrypt } from '@/lib/crypto';
import { logError } from '../error-logging';
import { publishToPage as publishToFacebookPage } from '@/core/facebook/api';
import { publishToLinkedIn } from '@/core/linkedin/api';

type PublicationResult = {
    accountId: string;
    platform: string;
    platformPostId: string;
    postLink: string;
    createdOn: any;
    logs: any[];
};

/**
 * Publishes a post collection to all its selected social media accounts.
 * @param postCollectionId The ID of the postCollection document in Firestore.
 */
export async function publishContent(postCollectionId: string) {
  const pcDocRef = doc(db, 'postCollections', postCollectionId);
  let postCollectionData;

  try {
    const pcSnap = await getDoc(pcDocRef);
    if (!pcSnap.exists()) {
      throw new Error(`Post Collection with ID ${postCollectionId} not found.`);
    }
    postCollectionData = pcSnap.data();

    if (!postCollectionData.accountIds || postCollectionData.accountIds.length === 0) {
      throw new Error(`Post Collection ${postCollectionId} has no accounts selected for publishing.`);
    }

    const accountsCollection = collection(db, 'connected_accounts');
    const publicationPromises = postCollectionData.accountIds.map(async (accountId: string) => {
      const accountDocRef = doc(accountsCollection, accountId);
      const accountSnap = await getDoc(accountDocRef);

      if (!accountSnap.exists()) {
        throw new Error(`Account with ID ${accountId} not found.`);
      }
      const account = accountSnap.data();
      const pageId = account.platformId;
      const encryptedToken = account.encryptedToken;
      
      let individualPostRef = null;

      try {
        const token = await decrypt(encryptedToken);
        
        let response = null;
        let postLink = '';
        let platformPostId = '';

        if (account.platform === 'Facebook') {
          response = await publishToFacebookPage(pageId, token, postCollectionData.content, postCollectionData.mediaUrls, postCollectionData.ctaType, postCollectionData.ctaLink);
          platformPostId = response.post_id || response.id;
          postLink = `https://www.facebook.com/${platformPostId}`;
          console.log(`Successfully published to Facebook page: ${account.name} (${pageId}). Post ID: ${platformPostId}`);
        } else if (account.platform === 'LinkedIn') {
            const authorUrn = `urn:li:person:${pageId}`;
            response = await publishToLinkedIn(token, authorUrn, postCollectionData.content, postCollectionData.mediaUrls);
            platformPostId = response.id; // The URN of the post, e.g., urn:li:share:123
            // The post link for UGC posts is different
            postLink = `https://www.linkedin.com/feed/update/${platformPostId}/`;
             console.log(`Successfully published to LinkedIn: ${account.name}. Post ID: ${platformPostId}`);
        } else {
           console.warn(`Publishing for platform '${account.platform}' is not yet implemented.`);
           return null; // Skip unsupported platforms
        }

        // Create a new document in the 'posts' collection for this successful publication
        const postData = {
            postCollectionId: postCollectionId,
            accountId: accountId,
            platform: account.platform,
            platformPostId: platformPostId,
            message: postCollectionData.content,
            postLink: postLink,
            createdBy: postCollectionData.author,
            createdOn: serverTimestamp(),
            analytics: [],
            logs: ['Published successfully'],
        };
        individualPostRef = await addDoc(collection(db, 'posts'), postData);
        
        // Return the ID of the new post document
        return individualPostRef.id;

      } catch (error: any) {
        await logError({
          source: 'publishContent - Account Publishing',
          message: `Failed to publish to ${account.platform} account: ${account.name}`,
          context: { postCollectionId, accountId, pageId, errorMessage: error.message },
          userId: account.owner,
        });
        // We throw here to make the Promise.allSettled report it as rejected
        throw new Error(`Failed to publish to ${account.name}: ${error.message}`);
      }
    });

    const results = await Promise.allSettled(publicationPromises);
    const successfulPostIds = results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => (r as PromiseFulfilledResult<string>).value);

    // Update the post collection status and link the new post documents
    await updateDoc(pcDocRef, {
      status: 'Published',
      publishedAt: serverTimestamp(),
      scheduledAt: null,
      postsId: arrayUnion(...successfulPostIds),
    });

  } catch (error: any) {
    await logError({
      source: 'publishContent - Main',
      message: 'One or more publications failed during the process.',
      context: { postCollectionId, error: error.message },
      userId: postCollectionData?.author || 'unknown',
    });

    // We re-throw the error so the calling action can handle it
    throw error;
  }
}

    