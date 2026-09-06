'use server';

import { getConversation } from '@/services/conversations';
import { recordOutgoingMessageAction } from '@/services/messages/actions';
import { decrypt } from '#/core/helpers/crypto';
import { getInboxAccount } from '@/services/inbox/account-data';
import { sendInstagramReply } from './send-reply';

export async function sendInstagramMessageFromInbox({ channelId, recipientId, message, conversationId, replyToMessageId }: {
  channelId: string; recipientId: string; message: string; conversationId?: string; replyToMessageId?: string;
}) {
  const account = await getInboxAccount(channelId);
  if (!account?.encryptedToken || !account.platformId) throw new Error('Instagram account credentials are missing.');
  const accessToken = await decrypt(account.encryptedToken);
  let actualRecipientId = recipientId;
  const conversation = conversationId ? await getConversation(conversationId) : null;
  const details = conversation?.moreDetails as { platformInfo?: { recipientId?: string } } | null;
  if (details?.platformInfo?.recipientId) actualRecipientId = details.platformInfo.recipientId;

  const result = await sendInstagramReply({ igUserId: account.platformId, recipientId: actualRecipientId, accessToken, text: message, replyToMessageId });
  await recordOutgoingMessageAction({
    conversationId,
    channelId,
    contactId: actualRecipientId,
    contactName: conversation?.contactName ?? `Instagram User ${actualRecipientId.slice(-6)}`,
    platform: 'Instagram',
    text: message,
    platformMessageId: result.message_id,
  });
  return result;
}
