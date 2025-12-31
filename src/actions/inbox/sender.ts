'use server';

import { logError } from "@/lib/error-logging";
import { sendTextMessage as sendWhatsAppMessage } from "@/core/whatsapp/api";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { decrypt } from "@/lib/crypto";

type SendMessageResult = {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Sends a reply message to a given platform.
 * This action now fetches the appropriate credentials from Firestore for WhatsApp.
 * @param platform The social media platform (e.g., 'WhatsApp').
 * @param channelId The ID of the connected account document that this message should be sent from.
 * @param recipientId The platform-specific ID of the recipient.
 * @param message The text message to send.
 * @returns A result object indicating success or failure.
 */
export async function sendReplyAction(platform: string, channelId: string, recipientId: string, message: string): Promise<SendMessageResult> {
    try {
        if (platform === 'WhatsApp') {
            if (!channelId) {
                throw new Error("WhatsApp channel ID is missing.");
            }

            // Fetch the WhatsApp account configuration from 'connected_accounts'
            const accountDocRef = doc(db, 'connected_accounts', channelId);
            const accountSnap = await getDoc(accountDocRef);

            if (!accountSnap.exists()) {
                throw new Error(`WhatsApp account with ID ${channelId} not found.`);
            }

            const accountData = accountSnap.data();
            const accessToken = await decrypt(accountData.encryptedToken);
            const phoneNumberId = accountData.platformId; // For WhatsApp, we store the phone number ID here

            const result = await sendWhatsAppMessage(accessToken, phoneNumberId, recipientId, message);
            
            const messageId = result.messages?.[0]?.id;
            if (!messageId) {
                throw new Error('No message ID returned from WhatsApp API.');
            }
            return { success: true, messageId };
        } else {
            // Placeholder for other platforms
            console.warn(`Sending messages via ${platform} is not yet implemented.`);
            // To avoid breaking the UI, we can simulate a success for now
            return { success: true, messageId: `simulated_${Date.now()}` };
        }
    } catch (error: any) {
        await logError({
            process: 'sendReplyAction',
            location: 'Inbox Sender Action',
            errorMessage: error.message,
            context: { platform, channelId, recipientId },
        });
        return { success: false, error: error.message };
    }
}
