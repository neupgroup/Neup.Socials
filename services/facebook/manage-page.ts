/**
 * @fileoverview Server-side actions for managing connected Facebook Pages.
 *
 * Provides Page role retrieval, Page details management, settings
 * management, review retrieval, user blocking, and change proposal
 * response operations.
 *
 * Resolves connected account credentials, decrypts Page Access Tokens,
 * delegates requests to the Facebook API service, and handles errors
 * through the application's centralized error-logging service.
 *
 * @module services/facebook/manage-page
 */

'use server';

import { dataStore } from '@/services/repositories';
import { decrypt } from '@neup/core/helpers/crypto';
import { logError } from '@/services/error-logging';
import {
	blockPageUser,
	getPageDetails,
	getPageRatings,
	getPageRoles,
	getPageSettings,
	respondToPageChangeProposal,
	updatePageDetails,
	updatePageSetting,
} from '@/services/facebook/api';

/**
 * Represents a primitive value supported by JSON.
 */
type JsonScalar = string | number | boolean | null;

/**
 * Represents a recursively structured JSON-compatible value.
 *
 * Supports primitive values, arrays, and objects containing
 * additional JSON-compatible values.
 */
type JsonValue = JsonScalar | JsonValue[] | { [key: string]: JsonValue };

/**
 * Represents the standardized result of a Facebook Page management action.
 *
 * @typeParam T - Expected structure of the operation's response data.
 */
type ActionResult<T> = {
	/** Indicates whether the action completed without a caught exception. */
	success: boolean;

	/** Response data returned by the delegated API operation. */
	data?: T;

	/** Error message describing an unsuccessful operation. */
	error?: string;
};

/**
 * Resolves and validates the credentials of a connected Facebook Page.
 *
 * Retrieves the connected account using its internal identifier,
 * verifies its platform and required credentials, and decrypts
 * the stored Page Access Token.
 *
 * @param accountId - Internal identifier of the connected account.
 *
 * @returns A promise resolving to the external Facebook Page identifier
 * and decrypted Page Access Token.
 *
 * @throws {Error} When the connected account cannot be found.
 * @throws {Error} When the account does not belong to Facebook.
 * @throws {Error} When the Facebook Page identifier is missing.
 * @throws {Error} When the encrypted Page Access Token is missing.
 * @throws Propagates repository retrieval and token decryption errors.
 *
 * @remarks
 * This function validates stored account information but does not
 * independently verify token validity, expiration, Page permissions,
 * or account ownership.
 */
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

/**
 * Retrieves role information associated with a connected Facebook Page.
 *
 * Resolves the Page credentials and delegates role retrieval
 * to the Facebook API service.
 *
 * @param accountId - Internal identifier of the connected Facebook account.
 *
 * @returns A promise resolving to the Page roles response on success,
 * or a structured failure result containing an error message.
 *
 * @throws May reject if the error-logging operation itself fails.
 *
 * @see getActivePageAccount
 * @see getPageRoles
 */
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

/**
 * Retrieves selected information fields for a connected Facebook Page.
 *
 * Resolves the Page credentials and forwards the requested field
 * collection to the Facebook API service.
 *
 * @param accountId - Internal identifier of the connected Facebook account.
 * @param fields - Collection of Facebook Page field names to retrieve.
 *
 * @returns A promise resolving to a structured result containing
 * the requested Page information as JSON-compatible values,
 * or an error message when retrieval fails.
 *
 * @remarks
 * Requested fields are forwarded without local field validation.
 * Available fields depend on the underlying API and granted permissions.
 *
 * @throws May reject if the error-logging operation itself fails.
 *
 * @see getPageDetails
 */
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

/**
 * Updates information associated with a connected Facebook Page.
 *
 * Resolves the Page credentials and forwards the supplied field
 * updates to the Facebook API service.
 *
 * @param accountId - Internal identifier of the connected Facebook account.
 * @param updates - Mapping of Page field names to their proposed
 * string, numeric, or boolean values.
 *
 * @returns A promise resolving to the delegated update response,
 * or a structured failure result containing an error message.
 *
 * @remarks
 * Field names and values are not validated within this action.
 * The outer success property indicates that the delegated request
 * returned without throwing, while data.success represents the
 * success value returned by the underlying service.
 *
 * Failed operations include the supplied updates in the logging context.
 *
 * @throws May reject if the error-logging operation itself fails.
 *
 * @see updatePageDetails
 */
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

/**
 * Retrieves settings associated with a connected Facebook Page.
 *
 * Resolves the Page credentials and delegates settings retrieval
 * to the Facebook API service.
 *
 * @param accountId - Internal identifier of the connected Facebook account.
 *
 * @returns A promise resolving to the Page settings response,
 * or a structured failure result containing an error message.
 *
 * @throws May reject if the error-logging operation itself fails.
 *
 * @see getPageSettings
 */
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

/**
 * Updates an individual setting associated with a Facebook Page.
 *
 * Resolves the connected Page credentials and forwards the
 * specified setting name and value to the Facebook API service.
 *
 * @param accountId - Internal identifier of the connected Facebook account.
 * @param setting - Name of the Facebook Page setting to update.
 * @param value - Proposed string, numeric, or boolean setting value.
 *
 * @returns A promise resolving to the delegated setting update response,
 * or a structured failure result containing an error message.
 *
 * @remarks
 * Setting names and values are forwarded without local validation.
 * Failed operations include the setting name and value in the
 * error-logging context.
 *
 * @throws May reject if the error-logging operation itself fails.
 *
 * @see updatePageSetting
 */
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

/**
 * Retrieves reviews or ratings associated with a connected Facebook Page.
 *
 * Resolves the Page credentials and delegates retrieval to the
 * Facebook Page ratings service.
 *
 * @param accountId - Internal identifier of the connected Facebook account.
 * @param limit - Requested maximum number of rating records.
 * Defaults to 25.
 *
 * @returns A promise resolving to the ratings response returned
 * by the underlying API service, or a structured failure result.
 *
 * @remarks
 * Pagination behavior and available rating information depend on
 * the underlying Facebook API service.
 *
 * @throws May reject if the error-logging operation itself fails.
 *
 * @see getPageRatings
 */
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

/**
 * Submits a request to block a user from a connected Facebook Page.
 *
 * Resolves the Page credentials and delegates the blocking operation
 * to the Facebook API service using the supplied Page-Scoped User ID.
 *
 * @param accountId - Internal identifier of the connected Facebook account.
 * @param userPsid - Page-Scoped User ID of the user to block.
 *
 * @returns A promise resolving to the boolean-valued response
 * returned by the blocking service, or a structured failure result.
 *
 * @remarks
 * The caller is responsible for supplying the intended user's
 * Page-Scoped User ID. No local verification of the target user's
 * association with the selected Page is performed.
 *
 * @throws May reject if the error-logging operation itself fails.
 *
 * @see blockPageUser
 */
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

/**
 * Submits an acceptance or rejection response to a Facebook Page
 * change proposal.
 *
 * Resolves the connected Page credentials and forwards the proposal
 * identifier and response decision to the Facebook API service.
 *
 * @param accountId - Internal identifier of the connected Facebook account.
 * @param proposalId - Identifier of the Page change proposal.
 * @param accept - Whether to accept the proposal.
 * True accepts the proposal; false requests rejection.
 *
 * @returns A promise resolving to the delegated proposal response,
 * or a structured failure result containing an error message.
 *
 * @remarks
 * The proposal's association with the selected Page is not
 * independently verified within this action.
 *
 * @throws May reject if the error-logging operation itself fails.
 *
 * @see respondToPageChangeProposal
 */
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
