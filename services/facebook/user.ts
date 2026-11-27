/**
 * @fileoverview Server-side action for constructing Facebook user profiles
 * from persisted identity, comment, and connected account records.
 *
 * Resolves user display information, profile pictures, associated
 * Facebook Page accounts, and recent comment history using
 * locally stored application data.
 *
 * @module services/facebook/user
 */

'use server';

import { dataStore } from '@/services/repositories';

/**
 * Represents a connected Facebook Page account associated
 * with a user's stored comment activity.
 */
type FacebookUserAccountOption = {
  /** Internal identifier of the connected account. */
  id: string;

  /** Resolved display name of the connected Facebook Page. */
  name: string;

  /** External identifier of the Facebook Page. */
  pageId: string;
};

/**
 * Represents a normalized historical comment associated
 * with a Facebook user profile.
 */
type FacebookUserComment = {
  /** Internal identifier of the stored comment record. */
  id: string;

  /** Text content of the comment. */
  text: string;

  /** ISO-formatted timestamp indicating when the comment was published. */
  commentedOn: string;

  /** Display name of the associated Facebook Page, when available. */
  pageName?: string;
};

/**
 * Represents an aggregated Facebook user profile constructed
 * from the application's locally persisted data.
 *
 * Combines platform identity information, profile metadata,
 * associated Facebook Page accounts, and recent comment history.
 */
export type FacebookUserProfile = {
  /** Normalized Page-Scoped User ID associated with the profile. */
  psid: string;

  /** Resolved display name of the Facebook user. */
  name: string;

  /** Resolved profile picture URL, when available. */
  profilePic?: string;

  /** Connected Facebook Pages associated with stored comment activity. */
  accountOptions: FacebookUserAccountOption[];

  /** Collection of normalized recent comments associated with the user. */
  recentComments: FacebookUserComment[];
};

/**
 * Converts an unknown value into an object-like record for metadata access.
 *
 * Accepts non-null object values and casts them into a record with
 * string keys and unknown values.
 *
 * @param value - Unknown value to interpret as an object.
 *
 * @returns The supplied value cast to an object record when it is
 * a non-null object; otherwise, an empty object.
 *
 * @remarks
 * This function does not perform deep validation, clone the supplied
 * object, or restrict the accepted value to plain JavaScript objects.
 * Arrays and other non-null object values also satisfy the condition.
 */
const asObject = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }

  return {};
};

/**
 * Constructs a Facebook user profile from locally stored identity
 * information, comment history, and connected Facebook Page accounts.
 *
 * Normalizes the supplied Page-Scoped User ID, retrieves matching
 * platform identity information, and resolves associated comments
 * from the application's Facebook comment repository.
 *
 * Identifies Facebook Pages referenced in stored comment metadata
 * and matches them against available connected account records.
 *
 * Resolves the user's display name and profile picture using
 * unified identity metadata, followed by available comment metadata.
 *
 * @param psid - Page-Scoped User ID of the Facebook user whose
 * locally stored profile should be retrieved.
 *
 * @returns A promise resolving to an aggregated Facebook user profile
 * containing the normalized identifier, display name, optional profile
 * picture, associated account options, and recent comment history.
 *
 * @throws {Error} When the supplied user identifier is empty after normalization.
 * @throws Propagates repository retrieval, date conversion, and
 * other unexpected processing errors.
 *
 * @remarks
 * The function retrieves up to 1000 recent Facebook comment records
 * before filtering them by the requested PSID. A maximum of 100
 * matching comments is included in the returned profile.
 *
 * Up to 500 connected accounts are retrieved before filtering for
 * Facebook accounts with valid platform identifiers.
 *
 * Account options are derived exclusively from Page identifiers
 * present in the selected comment metadata.
 *
 * Display names are resolved using the following fallback order:
 * unified identity name, comment metadata name, and a generated
 * name containing the final six characters of the PSID.
 *
 * Profile pictures are resolved from unified identity metadata,
 * followed by the first selected comment's metadata.
 *
 * The first matching comment is treated as the latest comment
 * according to the ordering provided by the underlying repository.
 *
 * This function does not perform live Facebook Graph API requests.
 * Returned profile information reflects locally persisted data
 * and may not represent the user's current Facebook profile.
 *
 * Account associations are inferred from stored activity and do
 * not independently establish account access or messaging eligibility.
 *
 * @see FacebookUserProfile
 * @see asObject
 */
export async function getFacebookUserProfileAction(psid: string): Promise<FacebookUserProfile> {
  // Normalize and validate the supplied platform user identifier.
  const normalizedPsid = String(psid || '').trim();
  if (!normalizedPsid) {
    throw new Error('User id is required.');
  }

  // Retrieve the platform identity and associated unified identity information.
  const identity = await dataStore.identityPlatform.findByPlatformUserId({
    platform: 'facebook',
    platUserId: normalizedPsid,
  });

  // Retrieve recent comments and retain those associated with the requested user.
  const allComments = await dataStore.facebookComments.listRecent({ take: 1000 });
  const comments = allComments.filter((comment) => comment.psid === normalizedPsid).slice(0, 100);

  // Extract comment metadata and select the first entry for profile fallbacks.
  const commentMetadata = comments.map((comment) => asObject(comment.moreInfo));
  const latestMeta = commentMetadata[0] ?? {};

  // Extract unique Facebook Page identifiers referenced by the user's comments.
  const pageIds = Array.from(
    new Set(
      commentMetadata
        .map((meta) => String(meta.pageId ?? '').trim())
        .filter(Boolean)
    )
  );

  // Retrieve connected accounts and retain accounts associated with Facebook.
  const allFacebookAccounts = (await dataStore.accounts.list({ take: 500 })).filter(
    (account) => account.platform === 'Facebook' && account.platformId
  );

  // Resolve connected Facebook Pages associated with the selected comment history.
  const accounts = allFacebookAccounts
    .filter((account) => pageIds.includes(String(account.platformId)))
    .map((account) => ({
      id: account.id,
      name: account.name || account.username || 'Facebook Page',
      pageId: String(account.platformId),
    }));

  // Resolve profile picture candidates from identity and comment metadata.
  const moreInfo = asObject(identity?.unified?.moreInfo);
  const profilePicFromIdentity = String(moreInfo.profilePic ?? '').trim();
  const profilePicFromComment = String(latestMeta.commenterProfilePic ?? '').trim();

  // Resolve display name candidates from identity and comment metadata.
  const nameFromIdentity = String(identity?.unified?.name ?? '').trim();
  const nameFromComment = String(latestMeta.commenterName ?? '').trim();

  // Normalize stored comments into the user profile's comment history structure.
  const recentComments: FacebookUserComment[] = comments.map((comment) => {
    const info = asObject(comment.moreInfo);
    return {
      id: comment.id,
      text: comment.comment,
      commentedOn: comment.commentedOn.toISOString(),
      pageName: String(info.pageName ?? '').trim() || undefined,
    };
  });

  // Construct the aggregated user profile using available metadata and fallbacks.
  return {
    psid: normalizedPsid,
    name: nameFromIdentity || nameFromComment || `Facebook User ${normalizedPsid.slice(-6)}`,
    profilePic: profilePicFromIdentity || profilePicFromComment || undefined,
    accountOptions: accounts,
    recentComments,
  };
}
