'use server';

import { dataStore } from '@/lib/data-store';
import { decrypt } from '@/lib/crypto';
import { logError } from '@/lib/error-logging';
import {
	blockPageUser,
	getPageDetails,
	getPageRatings,
	getPageRoles,
	getPageSettings,
	respondToPageChangeProposal,
	updatePageDetails,
	updatePageSetting,
} from '@/core/facebook/api';

type JsonScalar = string | number | boolean | null;
type JsonValue = JsonScalar | JsonValue[] | { [key: string]: JsonValue };

type ActionResult<T> = {
	success: boolean;
	data?: T;
	error?: string;
};

async function getActivePageAccount(accountId: string) {
	const account = await dataStore.accounts.getById(accountId);
	if (!account) {
		throw new Error('Facebook page account not found');
	}

	if (account.platform !== 'Facebook') {
		throw new Error('This action only supports Facebook pages');
	}

	if (!account.platformId) {
		throw new Error('Facebook page is missing page ID');
	}

	if (!account.encryptedToken) {
		throw new Error('Missing page access token for this account');
	}

	const pageToken = await decrypt(account.encryptedToken);

	return {
		pageId: account.platformId,
		pageToken,
	};
}

export async function getFacebookPageRolesAction(accountId: string): Promise<ActionResult<Awaited<ReturnType<typeof getPageRoles>>>> {
	try {
		const account = await getActivePageAccount(accountId);
		const data = await getPageRoles(account.pageId, account.pageToken);
		return { success: true, data };
	} catch (error: any) {
		await logError({
			process: 'getFacebookPageRolesAction',
			location: 'Facebook Manage Page Action',
			errorMessage: error.message,
			context: { accountId },
		});
		return { success: false, error: error.message };
	}
}

export async function getFacebookPageDetailsAction(
	accountId: string,
	fields: string[]
): Promise<ActionResult<Record<string, JsonValue>>> {
	try {
		const account = await getActivePageAccount(accountId);
		const data = await getPageDetails<Record<string, JsonValue>>(account.pageId, account.pageToken, fields);
		return { success: true, data };
	} catch (error: any) {
		await logError({
			process: 'getFacebookPageDetailsAction',
			location: 'Facebook Manage Page Action',
			errorMessage: error.message,
			context: { accountId, fields },
		});
		return { success: false, error: error.message };
	}
}

export async function updateFacebookPageDetailsAction(
	accountId: string,
	updates: Record<string, string | number | boolean>
): Promise<ActionResult<{ success: boolean }>> {
	try {
		const account = await getActivePageAccount(accountId);
		const data = await updatePageDetails(account.pageId, account.pageToken, updates);
		return { success: true, data };
	} catch (error: any) {
		await logError({
			process: 'updateFacebookPageDetailsAction',
			location: 'Facebook Manage Page Action',
			errorMessage: error.message,
			context: { accountId, updates },
		});
		return { success: false, error: error.message };
	}
}

export async function getFacebookPageSettingsAction(accountId: string): Promise<ActionResult<Awaited<ReturnType<typeof getPageSettings>>>> {
	try {
		const account = await getActivePageAccount(accountId);
		const data = await getPageSettings(account.pageId, account.pageToken);
		return { success: true, data };
	} catch (error: any) {
		await logError({
			process: 'getFacebookPageSettingsAction',
			location: 'Facebook Manage Page Action',
			errorMessage: error.message,
			context: { accountId },
		});
		return { success: false, error: error.message };
	}
}

export async function updateFacebookPageSettingAction(
	accountId: string,
	setting: string,
	value: string | number | boolean
): Promise<ActionResult<{ success: boolean }>> {
	try {
		const account = await getActivePageAccount(accountId);
		const data = await updatePageSetting(account.pageId, account.pageToken, setting, value);
		return { success: true, data };
	} catch (error: any) {
		await logError({
			process: 'updateFacebookPageSettingAction',
			location: 'Facebook Manage Page Action',
			errorMessage: error.message,
			context: { accountId, setting, value },
		});
		return { success: false, error: error.message };
	}
}

export async function getFacebookPageReviewsAction(
	accountId: string,
	limit = 25
): Promise<ActionResult<Awaited<ReturnType<typeof getPageRatings>>>> {
	try {
		const account = await getActivePageAccount(accountId);
		const data = await getPageRatings(account.pageId, account.pageToken, limit);
		return { success: true, data };
	} catch (error: any) {
		await logError({
			process: 'getFacebookPageReviewsAction',
			location: 'Facebook Manage Page Action',
			errorMessage: error.message,
			context: { accountId, limit },
		});
		return { success: false, error: error.message };
	}
}

export async function blockFacebookPageUserAction(
	accountId: string,
	userPsid: string
): Promise<ActionResult<Record<string, boolean>>> {
	try {
		const account = await getActivePageAccount(accountId);
		const data = await blockPageUser(account.pageId, account.pageToken, userPsid);
		return { success: true, data };
	} catch (error: any) {
		await logError({
			process: 'blockFacebookPageUserAction',
			location: 'Facebook Manage Page Action',
			errorMessage: error.message,
			context: { accountId, userPsid },
		});
		return { success: false, error: error.message };
	}
}

export async function respondToFacebookPageProposalAction(
	accountId: string,
	proposalId: string,
	accept: boolean
): Promise<ActionResult<{ success: boolean }>> {
	try {
		const account = await getActivePageAccount(accountId);
		const data = await respondToPageChangeProposal(proposalId, account.pageToken, accept);
		return { success: true, data };
	} catch (error: any) {
		await logError({
			process: 'respondToFacebookPageProposalAction',
			location: 'Facebook Manage Page Action',
			errorMessage: error.message,
			context: { accountId, proposalId, accept },
		});
		return { success: false, error: error.message };
	}
}

