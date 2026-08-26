'use server';

import { dataStore } from '@/core.v2/lib/data-store';

export const listConversations = dataStore.conversations.list;
export const getConversation = dataStore.conversations.getById;
export const findConversationByContactAndChannel = dataStore.conversations.findByContactAndChannel;
export const listConversationsByChannelIds = dataStore.conversations.listByChannelIds;
export const createConversation = dataStore.conversations.create;
export const updateConversation = dataStore.conversations.update;
