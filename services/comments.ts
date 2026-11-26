'use server';

import { dataStore } from '@/services/repositories';

/** Finds a commentor by platform, profile, and user. */
export const findCommentor = dataStore.commentors.findByPlatformProfileAndUser;

/** Creates or updates a commentor keyed by platform, profile, and user. */
export const upsertCommentor = dataStore.commentors.upsertByPlatformProfileAndUser;

/** Lists commentors for a platform across the given profiles. */
export const listCommentorsByPlatformAndProfiles = dataStore.commentors.listByPlatformAndProfiles;

/** Finds a comment by its platform-native comment ID. */
export const findCommentByPlatformCommentId = dataStore.comments.findByPlatformCommentId;

/** Creates a new comment record. */
export const createComment = dataStore.comments.create;

/** Lists comments for a platform across the given profiles. */
export const listCommentsByPlatformAndProfiles = dataStore.comments.listByPlatformAndProfiles;

/** Creates or updates a post-comment link keyed by comment ID. */
export const upsertPostComment = dataStore.postComments.upsertByCommentId;

/** Lists the comments attached to a given post. */
export const listPostComments = dataStore.postComments.listByPostId;

/** Gets a post-comment record by comment ID. */
export const getPostComment = dataStore.postComments.getByCommentId;

/** Lists the most recent post comments. */
export const listRecentPostComments = dataStore.postComments.listRecent;

/** Finds an existing Facebook comment, used to avoid duplicates. */
export const findFacebookComment = dataStore.facebookComments.findExisting;

/** Creates a Facebook comment record. */
export const createFacebookComment = dataStore.facebookComments.create;

/** Lists the most recent Facebook comments. */
export const listRecentFacebookComments = dataStore.facebookComments.listRecent;
