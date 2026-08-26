'use server';

import { dataStore } from '@/core.v2/lib/data-store';

export const listUploads = dataStore.uploads.list;
export const countUploads = dataStore.uploads.count;
export const listUploadsForLibrary = dataStore.uploads.listForLibrary;
export const getUpload = dataStore.uploads.getById;
export const createUpload = dataStore.uploads.create;
export const updateUpload = dataStore.uploads.update;
