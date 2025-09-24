/**
 * @fileoverview Server actions for fetching Facebook Page insights.
 */
'use server';

import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { decrypt } from '@/lib/crypto';
import { getPageInsights, InsightValue } from '@/core/facebook/api';
import { subDays, format } from 'date-fns';
import { logError } from '@/lib/error-logging';

type ConnectedAccount = {
  id: string;
  platform: string;
  name: string;
};

type GetAccountsResult = {
  success: boolean;
  accounts?: ConnectedAccount[];
  error?: string;
};

type GetInsightsResult = {
  success: boolean;
  data?: {
    totalFollowers: number;
    totalEngagement: number;
    totalReach: number;
    followerHistory: InsightValue[];
  };
  error?: string;
};

/**
 * Fetches all connected accounts for a given user.
 * @param ownerId The ID of the user.
 * @returns A list of connected accounts.
 */
export async function getConnectedAccounts(ownerId: string = 'neupkishor'): Promise<GetAccountsResult> {
  try {
    const accountsQuery = query(collection(db, 'connected_accounts'), where('owner', '==', ownerId));
    const querySnapshot = await getDocs(accountsQuery);
    const accounts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      platform: doc.data().platform,
      name: doc.data().name,
    }));
    return { success: true, accounts };
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
 * Fetches key insights for a specific Facebook Page.
 * @param accountId The Firestore document ID of the connected account.
 * @returns An object containing key insights.
 */
export async function getPageInsightsAction(accountId: string): Promise<GetInsightsResult> {
  try {
    const accountDocRef = doc(db, 'connected_accounts', accountId);
    const accountSnap = await getDoc(accountDocRef);

    if (!accountSnap.exists()) {
      throw new Error('Account not found.');
    }
    const account = accountSnap.data();
    if (account.platform !== 'Facebook') {
      throw new Error('Insights can only be fetched for Facebook pages.');
    }

    const pageToken = await decrypt(account.encryptedToken);
    const pageId = account.platformId;

    const today = new Date();
    const since = format(subDays(today, 30), 'yyyy-MM-dd');
    const until = format(today, 'yyyy-MM-dd');

    const metrics = ['page_fans', 'page_post_engagements', 'page_impressions_unique'];
    
    const insights = await getPageInsights(pageId, pageToken, metrics, since, until);

    const followerMetric = insights.data.find(m => m.name === 'page_fans' && m.period === 'day');
    const engagementMetric = insights.data.find(m => m.name ==='page_post_engagements' && m.period === 'day');
    const reachMetric = insights.data.find(m => m.name === 'page_impressions_unique' && m.period === 'day');
    
    // The 'page_fans' metric gives the total count at the end of each day.
    const totalFollowers = followerMetric?.values[followerMetric.values.length - 1]?.value || 0;
    const followerHistory = followerMetric?.values || [];

    // For total engagement and reach, we sum the daily values over the period.
    const totalEngagement = engagementMetric?.values.reduce((sum, v) => sum + v.value, 0) || 0;
    const totalReach = reachMetric?.values.reduce((sum, v) => sum + v.value, 0) || 0;


    return {
      success: true,
      data: {
        totalFollowers,
        totalEngagement,
        totalReach,
        followerHistory,
      },
    };

  } catch (error: any) {
    await logError({
      process: 'getPageInsightsAction',
      location: 'Insights Action',
      errorMessage: error.message,
      context: { accountId },
    });
    return { success: false, error: error.message };
  }
}
