/**
 * @fileoverview Handles the OAuth callback from Facebook.
 */
'use server';

import {
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  getUserPages,
} from '@/core/facebook/api';
import { validateState, encrypt } from '@/lib/crypto';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { logError } from '@/lib/error-logging';

/**
 * Handles the OAuth callback from Facebook. It exchanges the authorization code
 * for an access token, fetches the user's pages, and stores the page information
 * securely in Firestore.
 *
 * @param code - The authorization code provided by Facebook.
 * @param state - The state parameter for CSRF validation.
 * @returns An object indicating success or failure.
 */
export async function handleFacebookCallback(code: string, state: string) {
  let userId = 'anonymous';
  try {
    // 1. Validate the state parameter to prevent CSRF attacks.
    const validationResult = await validateState(state);
    userId = validationResult.userId;
    if (!userId) {
      throw new Error('State validation failed: No user ID present.');
    }

    // 2. Exchange the code for a short-lived user access token.
    const shortLivedTokenResponse = await exchangeCodeForShortLivedToken(code);

    // 3. Exchange the short-lived token for a long-lived one.
    const longLivedTokenResponse = await exchangeForLongLivedToken(
      shortLivedTokenResponse.access_token
    );
    const longLivedUserToken = longLivedTokenResponse.access_token;

    // 4. Fetch the user's pages using the long-lived user token.
    const pagesResponse = await getUserPages(longLivedUserToken);

    if (!pagesResponse.data || pagesResponse.data.length === 0) {
      return { success: false, error: 'No Facebook pages found for this user.' };
    }

    // 5. Store page details securely in Firestore for the user.
    const accountsCollection = collection(db, 'connected_accounts');
    for (const page of pagesResponse.data) {
        // Encrypt the long-lived page access token before storing.
        const encryptedToken = await encrypt(page.access_token);

        // Check if this page is already connected for this user
        const q = query(accountsCollection, where('platformId', '==', page.id), where('owner', '==', userId));
        const existingDocs = await getDocs(q);
        
        const accountData = {
            platform: 'Facebook',
            platformId: page.id,
            name: page.name,
            username: page.name, // Facebook pages don't have a user-facing @username like other platforms
            encryptedToken: encryptedToken,
            category: page.category,
            status: 'Active',
            owner: userId,
            connectedOn: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }

        if (existingDocs.empty) {
            // Add new document
            await addDoc(accountsCollection, accountData);
        } else {
            // Update existing document
            const docRef = existingDocs.docs[0].ref;
            await updateDoc(docRef, {
                ...accountData,
                connectedOn: existingDocs.docs[0].data().connectedOn, // Preserve original connection date
            });
        }
    }

    return { success: true, message: `${pagesResponse.data.length} Facebook page(s) connected successfully.` };
  } catch (error: any) {
    console.error('Error in Facebook callback handler:', error);
    
    // Log the error using the new service
    await logError({
        process: 'handleFacebookCallback',
        location: 'Facebook Callback Handler',
        errorMessage: error.message,
        user: userId,
        context: {
            step: 'Facebook OAuth Callback Processing',
            state,
        },
    });
    
    return { success: false, error: error.message || 'An unknown error occurred during the Facebook callback.' };
  }
}
