'use server';

import { createConversation, findConversationByContactAndChannel, findConversationByPlatformId } from '@/services/conversations';
import { createMessage, findMessageByPlatformMessageId } from '@/services/messages';
import { listAccounts } from '@/services/accounts';

type InstagramEvent = { sender?: { id?: string }; recipient?: { id?: string }; timestamp?: number; message?: { mid?: string; text?: string; attachments?: unknown } };

function eventsFromPayload(payload: any): InstagramEvent[] {
  if (payload?.sender || payload?.message) return [payload];
  return (payload?.entry ?? []).flatMap((entry: any) => entry?.messaging ?? []);
}

export async function receiveInstagramMessages(payload: any) {
  const events = eventsFromPayload(payload);
  const accounts = await listAccounts({ owner: 'neupkishor' });
  let stored = 0;

  for (const event of events) {
    const senderId = String(event.sender?.id ?? '').trim();
    const igUserId = String(event.recipient?.id ?? payload?.entry?.[0]?.id ?? '').trim();
    const messageId = String(event.message?.mid ?? '').trim();
    if (!senderId || !igUserId || !messageId || !event.message?.text) continue;
    if (await findMessageByPlatformMessageId(messageId)) continue;

    const account = accounts.find((item) => item.platform.toLowerCase() === 'instagram' && item.platformId === igUserId);
    if (!account) continue;
    const conversation = await findConversationByPlatformId(messageId)
      ?? await findConversationByContactAndChannel(senderId, account.id)
      ?? await createConversation({ contactId: senderId, contactName: senderId, channelId: account.id, platform: 'Instagram', lastMessage: event.message.text, lastMessageAt: new Date(Number(event.timestamp ?? Date.now()) * 1000), unread: true, avatar: senderId.slice(-2) });

    await createMessage({ conversationId: conversation.id, platform: 'Instagram', platformMessageId: messageId, text: event.message.text, sender: 'user', timestamp: new Date(Number(event.timestamp ?? Date.now()) * 1000) });
    stored += 1;
  }
  return { stored };
}
