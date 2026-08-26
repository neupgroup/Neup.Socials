'use server';

import { dataStore } from '@/core.v2/lib/data-store';

export const listPosts = dataStore.posts.list;
export const countPosts = dataStore.posts.count;
export const getPost = dataStore.posts.getById;
export const getPostsByIds = dataStore.posts.getByIds;
export const findExistingPlatformPostIds = dataStore.posts.findExistingPlatformPostIds;
export const createPost = dataStore.posts.create;
export const createPosts = dataStore.posts.createMany;
export const updatePost = dataStore.posts.update;
export const deletePost = dataStore.posts.delete;

export const getPostCollection = dataStore.postCollections.getById;
export const createPostCollection = dataStore.postCollections.create;
export const updatePostCollection = dataStore.postCollections.update;
export const appendPostsToCollection = dataStore.postCollections.appendPosts;
export const deletePostCollection = dataStore.postCollections.delete;
export const findPostCollectionsByMediaUrl = dataStore.postCollections.findByMediaUrl;
