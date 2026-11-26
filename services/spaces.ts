'use server';

import { dataStore } from '@/services/repositories';

/** Lists spaces. */
export const listSpaces = dataStore.spaces.list;

/** Gets a space by its internal ID. */
export const getSpace = dataStore.spaces.getById;

/** Creates a space. */
export const createSpace = dataStore.spaces.create;

/** Updates a space. */
export const updateSpace = dataStore.spaces.update;

/** Deletes a space. */
export const deleteSpace = dataStore.spaces.delete;

/** Lists the assets linked to a space. */
export const listSpaceAssets = dataStore.spaceAssets.listBySpaceId;

/** Replaces all assets linked to a space with a new set. */
export const replaceSpaceAssets = dataStore.spaceAssets.replaceForSpace;
