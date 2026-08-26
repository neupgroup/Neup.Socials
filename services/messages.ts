'use server';

import { dataStore } from '@/core.v2/lib/data-store';

export const listMessagesByConversationId = dataStore.messages.listByConversationId;
export const listMessagesByConversationIds = dataStore.messages.listByConversationIds;
export const findMessageByPlatformMessageId = dataStore.messages.findByPlatformMessageId;
export const createMessage = dataStore.messages.create;
