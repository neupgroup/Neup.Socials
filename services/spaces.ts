'use server';

import { dataStore } from '@/core.v2/lib/data-store';

export const listSpaces = dataStore.spaces.list;
export const getSpace = dataStore.spaces.getById;
export const createSpace = dataStore.spaces.create;
export const updateSpace = dataStore.spaces.update;
export const deleteSpace = dataStore.spaces.delete;
export const listSpaceAssets = dataStore.spaceAssets.listBySpaceId;
export const replaceSpaceAssets = dataStore.spaceAssets.replaceForSpace;
