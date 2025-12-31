
'use server';

import { collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logError } from '@/lib/error-logging';

/**
 * Processes the incoming webhook payload from WhatsApp.
 * It finds or creates a conversation and adds the message to it.
 * @param payload The full webhook payload from Meta.
 */
export async function processWhatsAppWebhook(payload: any) {
    if (payload.object !== 'whatsapp_business_account') {
        console.log('Webhook is not from a WhatsApp Business Account, skipping.');
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
                 console.log('Skipping non-text message or empty message.');
                continue;
            }
            
            const fromPhoneNumber = message.from; // This is the user's phone number
            const userProfileName = contact.profile.name;
            const businessPhoneNumberId = metadata.phone_number_id;

            try {
                // 1. Find the 'connected_accounts' document that matches the business phone number ID
                const accountsRef = collection(db, 'connected_accounts');
                const accountQuery = query(accountsRef, where('platform', '==', 'WhatsApp'), where('platformId', '==', businessPhoneNumberId));
                const accountSnapshot = await getDocs(accountQuery);

                if (accountSnapshot.empty) {
                    throw new Error(`No connected WhatsApp account found for phone number ID: ${businessPhoneNumberId}`);
                }
                const channelId = accountSnapshot.docs[0].id;
                
                // 2. Find or create the conversation document
                const convosRef = collection(db, 'conversations');
                const convoQuery = query(convosRef, where('contactId', '==', fromPhoneNumber), where('channelId', '==', channelId));
                const convoSnapshot = await getDocs(convoQuery);

                let convoId: string;
                if (convoSnapshot.empty) {
                    // Create new conversation
                    const newConvoData = {
                        contactId: fromPhoneNumber,
                        contactName: userProfileName,
                        platform: 'WhatsApp',
                        channelId: channelId,
                        lastMessage: message.text.body,
                        lastMessageAt: Timestamp.fromMillis(parseInt(message.timestamp, 10) * 1000),
                        unread: true,
                        avatar: fromPhoneNumber.slice(-2), // Simple avatar placeholder
                    };
                    const newConvoRef = await addDoc(convosRef, newConvoData);
                    convoId = newConvoRef.id;
                } else {
                    // Update existing conversation
                    convoId = convoSnapshot.docs[0].id;
                    await updateDoc(convoSnapshot.docs[0].ref, {
                        lastMessage: message.text.body,
                        lastMessageAt: Timestamp.fromMillis(parseInt(message.timestamp, 10) * 1000),
                        unread: true,
                    });
                }
                
                // 3. Add the message to the 'messages' subcollection
                const messagesRef = collection(db, 'conversations', convoId, 'messages');
                await addDoc(messagesRef, {
                    platformMessageId: message.id,
                    text: message.text.body,
                    sender: 'user', // Message is from the user
                    timestamp: Timestamp.fromMillis(parseInt(message.timestamp, 10) * 1000),
                });
                
                console.log(`Successfully processed message for conversation ${convoId}`);

            } catch(error: any) {
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
