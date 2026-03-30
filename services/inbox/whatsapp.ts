
'use server';

import { dataStore } from '@/lib/data-store';
import { logError } from '@/lib/error-logging';

/**
 * Processes the incoming webhook payload from WhatsApp.
 * It finds or creates a conversation and adds the message to it.
 * @param payload The full webhook payload from Meta.
 */
export async function processWhatsAppWebhook(payload: any) {
    console.log('⚡ [Service] Starting webhook processing...');

    if (payload.object !== 'whatsapp_business_account') {
        console.log('⚠️ [Service] Webhook is not from a WhatsApp Business Account, skipping.');
        return;
    }

    if (!payload.entry || !payload.entry.length) {
        console.log('⚠️ [Service] Payload entry matches no expected format.');
        return;
    }

    for (const entry of payload.entry) {
        for (const change of entry.changes) {
            const field = change.field;
            const value = change.value;

            console.log(`Processing field: ${field}`);

            try {
                switch (field) {
                    case 'messages':
                        await handleMessages(value);
                        break;
                    case 'calls':
                        await handleCalls(value);
                        break;
                    case 'account_alerts':
                        await handleAccountAlerts(value);
                        break;
                    case 'account_review_update':
                        await handleAccountReviewUpdate(value);
                        break;
                    case 'account_settings_update':
                        await handleAccountSettingsUpdate(value);
                        break;
                    default:
                        console.log(`⚠️ [Service] Unhandled field: ${field}`);
                }
            } catch (error: any) {
                console.error(`❌ [Service] Error processing field ${field}:`, error);
                await logError({
                    process: 'processWhatsAppWebhook',
                    location: 'Inbox Service',
                    errorMessage: error.message,
                    context: { field, value: JSON.stringify(value) }
                });
            }
        }
    }
}

async function handleMessages(value: any) {
    if (!value.messages || !value.messages.length) return;

    const message = value.messages[0];
    if (message.type !== 'text') {
        console.log('⚠️ [Service] Skipping non-text message.');
        // Note: You might want to handle images/videos here later
        return;
    }

    const context = {
        platformMessageId: message.id,
        text: message.text.body,
        timestamp: message.timestamp,
        type: 'text',
        ...extractCommonInfo(value, message)
    };

    await saveMessageToConversation(context);
}

async function handleCalls(value: any) {
    // According to docs/user example, value has "calls" array
    // Example: { calls: [{ id, to, from, timestamp, event: "connect" }] }
    if (!value.calls || !value.calls.length) return;

    const call = value.calls[0]; // Handle first call event
    const context = {
        platformMessageId: call.id,
        text: `Call ${call.event} - from ${call.from}`, // Fallback text
        timestamp: call.timestamp,
        type: 'call',
        callEvent: call.event,
        ...extractCommonInfo(value, call) // Ensure 'from' is handled correctly
    };

    // 'call' object has 'from' property
    context.fromPhoneNumber = call.from;

    await saveMessageToConversation(context);
}

// Extract common info like phone numbers
function extractCommonInfo(value: any, item: any) {
    const fromPhoneNumber = item.from;
    const metadata = value.metadata;
    const businessPhoneNumberId = metadata?.phone_number_id;
    const contact = value.contacts?.[0];
    const userProfileName = contact?.profile?.name || 'Unknown User';

    return {
        fromPhoneNumber,
        businessPhoneNumberId,
        userProfileName
    };
}

async function saveMessageToConversation(context: any) {
    const {
        platformMessageId, text, timestamp, type, fromPhoneNumber,
        businessPhoneNumberId, userProfileName, callEvent
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


async function handleAccountAlerts(value: any) {
    console.log('🔔 [Service] Processing Account Alert:', value);
    await dataStore.systemAlerts.create({
        type: 'account_alert',
        platform: 'WhatsApp',
        payload: value,
        timestamp: new Date(),
    });
}

async function handleAccountReviewUpdate(value: any) {
    console.log('⚖️ [Service] Processing Account Review Update:', value);
    await dataStore.systemAlerts.create({
        type: 'review_update',
        platform: 'WhatsApp',
        payload: value,
        timestamp: new Date(),
    });
}

async function handleAccountSettingsUpdate(value: any) {
    console.log('⚙️ [Service] Processing Account Settings Update:', value);
    await dataStore.systemAlerts.create({
        type: 'settings_update',
        platform: 'WhatsApp',
        payload: value,
        timestamp: new Date(),
    });
}
