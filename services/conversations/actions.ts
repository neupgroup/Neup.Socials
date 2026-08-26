'use server';

import { getConversation, listConversations } from '@/services/conversations';
import { listMessagesByConversationId } from '@/services/messages';

const toIso = (value?: Date | null) => (value ? value.toISOString() : null);
const serializeConversation = (conversation: Awaited<ReturnType<typeof getConversation>>) => conversation ? { ...conversation, lastMessageAt: toIso(conversation.lastMessageAt), createdAt: toIso(conversation.createdAt) } : null;
const serializeMessage = (message: Awaited<ReturnType<typeof listMessagesByConversationId>>[number]) => message ? { ...message, timestamp: toIso(message.timestamp) } : null;

export async function listConversationsAction() { return (await listConversations()).map((conversation) => serializeConversation(conversation)!); }
export async function getConversationAction(id: string) { return serializeConversation(await getConversation(id)); }
export async function listConversationMessagesAction(conversationId: string) { return (await listMessagesByConversationId(conversationId)).map((message) => serializeMessage(message)!); }
