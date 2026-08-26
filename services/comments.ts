'use server';

import { dataStore } from '@/core.v2/lib/data-store';

export const findCommentor = dataStore.commentors.findByPlatformProfileAndUser;
export const upsertCommentor = dataStore.commentors.upsertByPlatformProfileAndUser;
export const listCommentorsByPlatformAndProfiles = dataStore.commentors.listByPlatformAndProfiles;
export const findCommentByPlatformCommentId = dataStore.comments.findByPlatformCommentId;
export const createComment = dataStore.comments.create;
export const listCommentsByPlatformAndProfiles = dataStore.comments.listByPlatformAndProfiles;
export const upsertPostComment = dataStore.postComments.upsertByCommentId;
export const listPostComments = dataStore.postComments.listByPostId;
export const getPostComment = dataStore.postComments.getByCommentId;
export const listRecentPostComments = dataStore.postComments.listRecent;
export const findFacebookComment = dataStore.facebookComments.findExisting;
export const createFacebookComment = dataStore.facebookComments.create;
export const listRecentFacebookComments = dataStore.facebookComments.listRecent;
