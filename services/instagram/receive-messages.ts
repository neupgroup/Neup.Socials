'use server';

import { createConversation, findConversationByContactAndChannel, findConversationByPlatformId } from '@/services/conversations';
import { createMessage, findMessageByPlatformMessageId, type MessageContentType } from '@/services/messages';
import { listAccounts } from '@/services/accounts';

type InstagramEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: { mid?: string; text?: string; attachments?: { data?: Array<{ type?: string; url?: string }> } };
  message_edit?: { mid?: string; text?: string; num_edit?: number };
  reaction?: { mid?: string; action?: string; emoji?: string };
};

function eventsFromPayload(payload: any): InstagramEvent[] {
  if (payload?.sender || payload?.message) return [payload];
  return (payload?.entry ?? []).flatMap((entry: any) => [
    ...(entry?.messaging ?? []),
    ...(entry?.changes ?? []).map((change: any) => ({
      ...(change?.value ?? {}),
      ...(change?.field === 'message_edit' ? { message_edit: change.value } : {}),
      ...(change?.field === 'reaction' ? { reaction: change.value } : {}),
      recipient: change?.value?.recipient ?? { id: entry?.id },
    })),
  ]);
}

export async function receiveInstagramMessages(payload: any) {
  const events = eventsFromPayload(payload);
  const accounts = await listAccounts({ owner: 'neupkishor' });
  let stored = 0;

  for (const event of events) {
    const senderId = String(event.sender?.id ?? '').trim();
    const igUserId = String(event.recipient?.id ?? payload?.entry?.[0]?.id ?? '').trim();
    const messageId = String(event.message?.mid ?? event.message_edit?.mid ?? event.reaction?.mid ?? '').trim();
    if (!senderId || !igUserId || !messageId) continue;
    if (await findMessageByPlatformMessageId(messageId)) continue;

    const account = accounts.find((item) => item.platform.toLowerCase() === 'instagram' && item.platformId === igUserId);
    if (!account) continue;
    const conversation = await findConversationByPlatformId(messageId)
      ?? await findConversationByContactAndChannel(senderId, account.id)
      ?? await createConversation({ contactId: senderId, contactName: senderId, channelId: account.id, platform: 'Instagram', lastMessage: event.message?.text ?? event.message_edit?.text ?? '', lastMessageAt: new Date(Number(event.timestamp ?? Date.now()) * 1000), unread: true, avatar: senderId.slice(-2) });

    const attachmentType = event.message?.attachments?.data?.[0]?.type?.toLowerCase();
    const type: MessageContentType = event.reaction
      ? 'reaction.like'
      : event.message_edit
        ? 'text'
        : attachmentType === 'audio'
          ? 'voice_message'
          : attachmentType === 'video'
            ? 'media_video'
            : attachmentType === 'image'
              ? 'media_image'
              : event.message?.text?.includes('http')
                ? 'link'
                : 'text';
    const content = event.reaction
      ? `${event.reaction.action ?? 'reaction'}${event.reaction.emoji ? `:${event.reaction.emoji}` : ''}`
      : event.message_edit?.text ?? event.message?.text ?? '';
    if (!content) continue;
    const attachments = event.message?.attachments;

    await createMessage({ conversationId: conversation.id, platform: 'Instagram', platformMessageId: messageId, content, direction: 'received', senderId: null, messageTime: new Date(Number(event.timestamp ?? Date.now()) * 1000), type, platformInfo: { sender: senderId, receiver: igUserId, ...(event.message_edit ? { edit: event.message_edit } : {}), ...(event.reaction ? { reaction: event.reaction } : {}), ...(attachments ? { attachments } : {}) } });
    stored += 1;
  }
  return { stored };
}
