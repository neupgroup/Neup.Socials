'use server';

import { dataStore } from '@/services/repositories';

/** Lists posts. */
export const listPosts = dataStore.posts.list;

/** Counts posts. */
export const countPosts = dataStore.posts.count;

/** Gets a post by its internal ID. */
export const getPost = dataStore.posts.getById;

/** Gets multiple posts by their internal IDs. */
export const getPostsByIds = dataStore.posts.getByIds;

/** Given platform post IDs, returns the ones that already exist (used to skip duplicates when syncing). */
export const findExistingPlatformPostIds = dataStore.posts.findExistingPlatformPostIds;

/** Creates a post. */
export const createPost = dataStore.posts.create;

/** Creates multiple posts in one call. */
export const createPosts = dataStore.posts.createMany;

/** Updates a post. */
export const updatePost = dataStore.posts.update;

/** Deletes a post. */
export const deletePost = dataStore.posts.delete;

/** Gets a post collection by its internal ID. */
export const getPostCollection = dataStore.postCollections.getById;

/** Creates a post collection. */
export const createPostCollection = dataStore.postCollections.create;

/** Updates a post collection. */
export const updatePostCollection = dataStore.postCollections.update;

/** Appends posts to an existing post collection. */
export const appendPostsToCollection = dataStore.postCollections.appendPosts;

/** Deletes a post collection. */
export const deletePostCollection = dataStore.postCollections.delete;

/** Finds post collections that contain a given media URL. */
export const findPostCollectionsByMediaUrl = dataStore.postCollections.findByMediaUrl;
