
'use server';

import { dataStore } from '@/services/repositories';
import { decrypt } from '#/core/helpers/crypto';
import { logError } from '@/services/error-logging';
import { publishToPage as publishToFacebookPage } from '../../services/facebook/api';
import { publishToInstagramAccount } from '../../services/instagram/post-content';
import { publishToLinkedIn } from '../../services/linkedin/api';

/**
 * Publishes a post collection to all its selected social media accounts.
 * @param postCollectionId The ID of the postCollection document in Firestore.
 */
export async function publishContent(postCollectionId: string) {
  let postCollectionData: Awaited<ReturnType<typeof dataStore.postCollections.getById>> | null = null;

  try {
    console.info('[Publishing] Starting post collection publish', { postCollectionId });
    const postCollection = await dataStore.postCollections.getById(postCollectionId);
    if (!postCollection) {
      throw new Error(`Post Collection with ID ${postCollectionId} not found.`);
    }
    const collectionData = postCollection;
    postCollectionData = collectionData;
    console.info('[Publishing] Loaded post collection', {
      postCollectionId,
      contentLength: collectionData.content?.length ?? 0,
      mediaUrls: collectionData.mediaUrls,
      accountIds: collectionData.accountIds,
      platforms: collectionData.platforms,
      status: collectionData.status,
    });

    if (!collectionData.accountIds || collectionData.accountIds.length === 0) {
      throw new Error(`Post Collection ${postCollectionId} has no accounts selected for publishing.`);
    }

    const publicationPromises = collectionData.accountIds.map(async (accountId: string) => {
      const account = await dataStore.accounts.getById(accountId);

      if (!account) {
        throw new Error(`Account with ID ${accountId} not found.`);
      }
      const pageId = account.platformId;
      const encryptedToken = account.encryptedToken;
      if (!pageId || !encryptedToken) {
        throw new Error(`Account ${accountId} is missing publish credentials.`);
      }

      try {
        const token = await decrypt(encryptedToken);
        console.info('[Publishing] Publishing to account', {
          postCollectionId,
          accountId,
          platform: account.platform,
          accountName: account.name,
          platformId: pageId,
          mediaCount: collectionData.mediaUrls?.length ?? 0,
        });
        
        let response = null;
        let postLink = '';
        let platformPostId = '';

        if (account.platform === 'Facebook') {
          response = await publishToFacebookPage(
            pageId,
            token,
            collectionData.content,
            collectionData.mediaUrls,
            collectionData.ctaType ?? undefined,
            collectionData.ctaLink ?? undefined
          );
          platformPostId = response.post_id || response.id;
          postLink = `https://www.facebook.com/${platformPostId}`;
          console.log(`Successfully published to Facebook page: ${account.name} (${pageId}). Post ID: ${platformPostId}`);
        } else if (account.platform === 'Instagram') {
          response = await publishToInstagramAccount(
            pageId,
            token,
            collectionData.content,
            collectionData.mediaUrls,
          );
          platformPostId = response.id;
          console.log(`Successfully published to Instagram account: ${account.name} (${pageId}). Media ID: ${platformPostId}`);
        } else if (account.platform === 'LinkedIn') {
            const authorUrn = `urn:li:person:${pageId}`;
            response = await publishToLinkedIn(token, authorUrn, collectionData.content, collectionData.mediaUrls);
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
            message: collectionData.content,
            postLink: postLink,
            createdBy: collectionData.author,
            createdOn: new Date(),
          analytics: {},
            logs: ['Published successfully'],
            mediaUrls: collectionData.mediaUrls,
        };
        const individualPost = await dataStore.posts.create(postData);
        await dataStore.postCollections.appendPosts(postCollectionId, [individualPost.id]);
        console.info('[Publishing] Account publish completed', {
          postCollectionId,
          accountId,
          platform: account.platform,
          platformPostId,
          postId: individualPost.id,
        });
        return individualPost.id;

      } catch (error: any) {
        console.error('[Publishing] Account publish failed', {
          postCollectionId,
          accountId,
          platform: account.platform,
          accountName: account.name,
          errorMessage: error.message,
          stack: error.stack,
        });
        await logError({
          source: 'publishContent - Account Publishing',
          message: `Failed to publish to ${account.platform} account: ${account.name}`,
          context: { postCollectionId, accountId, pageId, errorMessage: error.message },
          userId: account.owner ?? undefined,
        });
        // We throw here to make the Promise.allSettled report it as rejected
        throw new Error(`Failed to publish to ${account.name}: ${error.message}`);
      }
    });

    const results = await Promise.allSettled(publicationPromises);
    const successfulPostIds = results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => (r as PromiseFulfilledResult<string>).value);

    await dataStore.postCollections.update(postCollectionId, {
      status: 'Published',
      publishedAt: new Date(),
      scheduledAt: null,
    });
    console.info('[Publishing] Post collection publish completed', {
      postCollectionId,
      successfulPostIds,
      successfulCount: successfulPostIds.length,
      attemptedCount: collectionData.accountIds.length,
    });

  } catch (error: any) {
    console.error('[Publishing] Post collection publish failed', {
      postCollectionId,
      errorMessage: error.message,
      stack: error.stack,
    });
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

    
