
'use server';

import { collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp, Timestamp, collectionGroup, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logError } from '@/lib/error-logging';

/**
 * Processes the incoming webhook payload from WhatsApp.
 * It finds or creates a conversation and adds the message to it.
 * @param payload The full webhook payload from Meta.
 */
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

    // Global duplicate check
    const globalMsgQuery = query(collectionGroup(db, 'messages'), where('platformMessageId', '==', platformMessageId));
    const globalMsgSnap = await getDocs(globalMsgQuery);

    if (!globalMsgSnap.empty) {
        console.log(`⚠️ [Service] Message ${platformMessageId} ALREADY PROCESSED (Global Check), skipping.`);
        return;
    }

    // 1. Find connected account
    const accountsRef = collection(db, 'connected_accounts');
    let accountQuery = query(accountsRef, where('platform', '==', 'WhatsApp'), where('platformId', '==', businessPhoneNumberId));
    let accountSnapshot = await getDocs(accountQuery);

    if (accountSnapshot.empty) {
        console.log(`⚠️ [Service] Account ID ${businessPhoneNumberId} not found. Checking for default/any WhatsApp account...`);
        accountQuery = query(accountsRef, where('platform', '==', 'WhatsApp'), limit(1));
        accountSnapshot = await getDocs(accountQuery);
        if (accountSnapshot.empty) {
            throw new Error(`No connected WhatsApp account found for phone number ID: ${businessPhoneNumberId}`);
        }
    }
    const channelId = accountSnapshot.docs[0].id;

    // 2. Find or create conversation
    const convosRef = collection(db, 'conversations');
    let convoQuery = query(convosRef, where('contactId', '==', fromPhoneNumber), where('channelId', '==', channelId));
    let convoSnapshot = await getDocs(convoQuery);

    if (convoSnapshot.empty) {
        const altPhoneNumber = fromPhoneNumber.startsWith('+') ? fromPhoneNumber.slice(1) : `+${fromPhoneNumber}`;
        convoQuery = query(convosRef, where('contactId', '==', altPhoneNumber), where('channelId', '==', channelId));
        convoSnapshot = await getDocs(convoQuery);
    }

    let convoId: string;
    const msgTimestamp = Timestamp.fromMillis(parseInt(timestamp, 10) * 1000);

    if (convoSnapshot.empty) {
        const finalContactId = fromPhoneNumber.startsWith('+') ? fromPhoneNumber : `+${fromPhoneNumber}`;
        console.log(`🆕 [Service] Creating NEW conversation for ${finalContactId}`);
        const newConvoData = {
            contactId: finalContactId,
            contactName: userProfileName,
            platform: 'WhatsApp',
            channelId: channelId,
            lastMessage: type === 'call' ? `Call: ${callEvent}` : text,
            lastMessageAt: msgTimestamp,
            unread: true,
            avatar: '',
        };
        const newConvoRef = await addDoc(convosRef, newConvoData);
        convoId = newConvoRef.id;
    } else {
        convoId = convoSnapshot.docs[0].id;
        await updateDoc(convoSnapshot.docs[0].ref, {
            lastMessage: type === 'call' ? `Call: ${callEvent}` : text,
            lastMessageAt: msgTimestamp,
            unread: true,
        });
    }

    // 3. Add message
    const messagesRef = collection(db, 'conversations', convoId, 'messages');
    await addDoc(messagesRef, {
        platformMessageId: platformMessageId,
        text: text,
        sender: 'user',
        timestamp: msgTimestamp,
        type: type, // 'text' usually, but now can be 'call'
        ...(callEvent ? { callEvent } : {})
    });
    console.log(`✅ [Service] Successfully processed ${type}`);
}


async function handleAccountAlerts(value: any) {
    // value has entity_id, alert_type, alert_description, etc.
    console.log('🔔 [Service] Processing Account Alert:', value);
    await addDoc(collection(db, 'system_alerts'), {
        type: 'account_alert',
        platform: 'WhatsApp',
        ...value,
        timestamp: serverTimestamp()
    });
}

async function handleAccountReviewUpdate(value: any) {
    console.log('⚖️ [Service] Processing Account Review Update:', value);
    // value has decision (e.g., APPROVED)
    await addDoc(collection(db, 'system_alerts'), {
        type: 'review_update',
        platform: 'WhatsApp',
        ...value,
        timestamp: serverTimestamp()
    });
}

async function handleAccountSettingsUpdate(value: any) {
    console.log('⚙️ [Service] Processing Account Settings Update:', value);
    await addDoc(collection(db, 'system_alerts'), {
        type: 'settings_update',
        platform: 'WhatsApp',
        ...value,
        timestamp: serverTimestamp()
    });
}
