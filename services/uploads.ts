'use server';

import { dataStore } from '@/services/repositories';

/** Lists uploads. */
export const listUploads = dataStore.uploads.list;

/** Counts uploads. */
export const countUploads = dataStore.uploads.count;

/** Lists uploads for the media library view. */
export const listUploadsForLibrary = dataStore.uploads.listForLibrary;

/** Gets an upload by its internal ID. */
export const getUpload = dataStore.uploads.getById;

/** Creates an upload record. */
export const createUpload = dataStore.uploads.create;

/** Updates an upload record. */
export const updateUpload = dataStore.uploads.update;
