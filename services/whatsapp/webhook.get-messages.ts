'use server';

import { dataStore } from '@/core/lib/data-store';

type MessageContext = {
  platformMessageId: string;
  text: string;
  timestamp: string;
  type: 'text' | 'call';
  fromPhoneNumber: string;
  businessPhoneNumberId?: string;
  userProfileName?: string;
  callEvent?: string | null;
};

function extractCommonInfo(value: any, item: any) {
  const fromPhoneNumber = item.from;
  const metadata = value.metadata;
  const businessPhoneNumberId = metadata?.phone_number_id;
  const contact = value.contacts?.[0];
  const userProfileName = contact?.profile?.name || 'Unknown User';

  return {
    fromPhoneNumber,
    businessPhoneNumberId,
    userProfileName,
  };
}

async function saveMessageToConversation(context: MessageContext) {
  const {
    platformMessageId,
    text,
    timestamp,
    type,
    fromPhoneNumber,
    businessPhoneNumberId,
    userProfileName,
    callEvent,
  } = context;

  console.log(`📨 [Service] Processing ${type} from ${fromPhoneNumber}`);

  const existingMessage = await dataStore.messages.findByPlatformMessageId(platformMessageId);

  if (existingMessage) {
    console.log(`⚠️ [Service] Message ${platformMessageId} ALREADY PROCESSED (Global Check), skipping.`);
    return;
  }

  const account = await dataStore.accounts.findWhatsAppAccount(businessPhoneNumberId);
  if (!account) {
    throw new Error(`No connected WhatsApp account found for phone number ID: ${businessPhoneNumberId}`);
  }
  const channelId = account.id;

  let conversation =
    (await dataStore.conversations.findByContactAndChannel(fromPhoneNumber, channelId)) ??
    (await dataStore.conversations.findByContactAndChannel(
      fromPhoneNumber.startsWith('+') ? fromPhoneNumber.slice(1) : `+${fromPhoneNumber}`,
      channelId
    ));

  const msgTimestamp = new Date(parseInt(timestamp, 10) * 1000);

  if (!conversation) {
    const finalContactId = fromPhoneNumber.startsWith('+') ? fromPhoneNumber : `+${fromPhoneNumber}`;
    console.log(`🆕 [Service] Creating NEW conversation for ${finalContactId}`);
    conversation = await dataStore.conversations.create({
      contactId: finalContactId,
      contactName: userProfileName,
      platform: 'WhatsApp',
      channelId: channelId,
      lastMessage: type === 'call' ? `Call: ${callEvent}` : text,
      lastMessageAt: msgTimestamp,
      unread: true,
      avatar: '',
    });
  } else {
    conversation = await dataStore.conversations.update(conversation.id, {
      lastMessage: type === 'call' ? `Call: ${callEvent}` : text,
      lastMessageAt: msgTimestamp,
      unread: true,
    });
  }

  await dataStore.messages.create({
    conversationId: conversation.id,
    platformMessageId: platformMessageId,
    text: text,
    sender: 'user',
    timestamp: msgTimestamp,
    type: type,
    callEvent: callEvent ?? null,
  });
  console.log(`✅ [Service] Successfully processed ${type}`);
}

export async function handleWhatsAppMessages(value: any) {
  if (!value.messages || !value.messages.length) return;

  const message = value.messages[0];
  if (message.type !== 'text') {
    console.log('⚠️ [Service] Skipping non-text message.');
    return;
  }

  const context: MessageContext = {
    platformMessageId: message.id,
    text: message.text.body,
    timestamp: message.timestamp,
    type: 'text',
    ...extractCommonInfo(value, message),
  };

  await saveMessageToConversation(context);
}

export async function handleWhatsAppCalls(value: any) {
  if (!value.calls || !value.calls.length) return;

  const call = value.calls[0];
  const context: MessageContext = {
    platformMessageId: call.id,
    text: `Call ${call.event} - from ${call.from}`,
    timestamp: call.timestamp,
    type: 'call',
    callEvent: call.event,
    ...extractCommonInfo(value, call),
  };

  context.fromPhoneNumber = call.from;

  await saveMessageToConversation(context);
}
