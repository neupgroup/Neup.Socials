
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
            if (change.field !== 'messages') {
                continue;
            }

            const value = change.value;
            const metadata = value.metadata;
            const message = value.messages?.[0];
            const contact = value.contacts?.[0];

            if (!message || message.type !== 'text') {
                console.log('⚠️ [Service] Skipping non-text message or empty message.');
                continue;
            }


            const fromPhoneNumber = message.from; // Raw number from WhatsApp (e.g., "977984...")
            const userProfileName = contact?.profile?.name || 'Unknown User';
            const businessPhoneNumberId = metadata.phone_number_id;

            console.log(`📨 [Service] Processing message from ${fromPhoneNumber} (ID: ${businessPhoneNumberId})`);

            try {
                // Global duplicate check to ensure idempotency
                const globalMsgQuery = query(collectionGroup(db, 'messages'), where('platformMessageId', '==', message.id));
                const globalMsgSnap = await getDocs(globalMsgQuery);

                if (!globalMsgSnap.empty) {
                    console.log(`⚠️ [Service] Message ${message.id} ALREADY PROCESSED (Global Check), skipping.`);
                    continue;
                }

                // 1. Find the 'connected_accounts' document that matches the business phone number ID
                const accountsRef = collection(db, 'connected_accounts');
                let accountQuery = query(accountsRef, where('platform', '==', 'WhatsApp'), where('platformId', '==', businessPhoneNumberId));
                let accountSnapshot = await getDocs(accountQuery);

                if (accountSnapshot.empty) {
                    console.log(`⚠️ [Service] Account ID ${businessPhoneNumberId} not found. Checking for default/any WhatsApp account...`);
                    // Fallback to allow conversation creation even if ID mapping is missing
                    accountQuery = query(accountsRef, where('platform', '==', 'WhatsApp'), limit(1));
                    accountSnapshot = await getDocs(accountQuery);

                    if (accountSnapshot.empty) {
                        throw new Error(`No connected WhatsApp account found for phone number ID: ${businessPhoneNumberId}`);
                    }
                    console.log(`⚠️ [Service] Using fallback account: ${accountSnapshot.docs[0].id}`);
                }
                const channelId = accountSnapshot.docs[0].id;
                console.log(`✅ [Service] Found connected account/channel: ${channelId}`);

                // 2. Find or create the conversation document
                // check for both with and without + prefix to be safe
                const convosRef = collection(db, 'conversations');

                // We'll search for the contact ID as-is first
                let convoQuery = query(convosRef, where('contactId', '==', fromPhoneNumber), where('channelId', '==', channelId));
                let convoSnapshot = await getDocs(convoQuery);

                // If not found, try adding a '+' if it's missing, or removing it if it's there
                if (convoSnapshot.empty) {
                    const altPhoneNumber = fromPhoneNumber.startsWith('+') ? fromPhoneNumber.slice(1) : `+${fromPhoneNumber}`;
                    console.log(`🔍 [Service] Conversation not found for ${fromPhoneNumber}, trying ${altPhoneNumber}...`);

                    convoQuery = query(convosRef, where('contactId', '==', altPhoneNumber), where('channelId', '==', channelId));
                    convoSnapshot = await getDocs(convoQuery);
                }

                let convoId: string;
                if (convoSnapshot.empty) {
                    // Create new conversation
                    // For consistency, let's prefer the format with '+' logic or just trust the incoming one?
                    // Let's stick to the incoming one for new convos unless you want to enforce strict formatting.
                    // Ideally, we'd use libphonenumber, but for now let's just use what WhatsApp gave us or ensure '+'
                    const finalContactId = fromPhoneNumber.startsWith('+') ? fromPhoneNumber : `+${fromPhoneNumber}`;

                    console.log(`🆕 [Service] Creating NEW conversation for ${finalContactId}`);

                    const newConvoData = {
                        contactId: finalContactId,
                        contactName: userProfileName,
                        platform: 'WhatsApp',
                        channelId: channelId,
                        lastMessage: message.text.body,
                        lastMessageAt: Timestamp.fromMillis(parseInt(message.timestamp, 10) * 1000),
                        unread: true,
                        avatar: '', // Add logic for avatar if available
                    };
                    const newConvoRef = await addDoc(convosRef, newConvoData);
                    convoId = newConvoRef.id;
                } else {
                    // Update existing conversation
                    convoId = convoSnapshot.docs[0].id;
                    console.log(`🔄 [Service] Updating EXISTING conversation: ${convoId}`);

                    await updateDoc(convoSnapshot.docs[0].ref, {
                        lastMessage: message.text.body,
                        lastMessageAt: Timestamp.fromMillis(parseInt(message.timestamp, 10) * 1000),
                        unread: true,
                    });
                }

                // 3. Add the message to the 'messages' subcollection
                // Check if message already exists to avoid duplicates
                const messagesRef = collection(db, 'conversations', convoId, 'messages');
                const existingMsgQuery = query(messagesRef, where('platformMessageId', '==', message.id));
                const existingMsgSnap = await getDocs(existingMsgQuery);

                if (!existingMsgSnap.empty) {
                    console.log(`⚠️ [Service] Message ${message.id} already exists, skipping.`);
                    continue;
                }

                await addDoc(messagesRef, {
                    platformMessageId: message.id,
                    text: message.text.body,
                    sender: 'user', // mark as from the user
                    timestamp: Timestamp.fromMillis(parseInt(message.timestamp, 10) * 1000),
                });

                console.log(`✅ [Service] Successfully processed message: "${message.text.body}"`);

            } catch (error: any) {
                console.error('❌ [Service] Error processing message:', error);
                await logError({
                    process: 'processWhatsAppWebhook',
                    location: 'Inbox Service',
                    errorMessage: error.message,
                    context: { from: fromPhoneNumber, businessPhoneNumberId }
                });
            }
        }
    }
}
