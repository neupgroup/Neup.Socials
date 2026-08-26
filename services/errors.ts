'use server';

import { dataStore } from '@/services/repositories';

export const listErrors = dataStore.errors.list;
export const getError = dataStore.errors.getById;
export const createError = dataStore.errors.create;
export const deleteError = dataStore.errors.delete;
export const clearErrors = dataStore.errors.clear;
