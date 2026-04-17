'use server';

import { logError } from "@/core/lib/error-logging";
import { sendTextMessage as sendWhatsAppMessage } from "../../services/whatsapp/api";
import { sendPageTextMessage as sendFacebookPageMessage } from "@/services/facebook/messages";
import { dataStore } from "@/core/lib/data-store";
import { decrypt } from "@/core/lib/crypto";

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

            const accountData = await dataStore.accounts.getById(channelId);

            if (!accountData) {
                throw new Error(`WhatsApp account with ID ${channelId} not found.`);
            }
            if (!accountData.encryptedToken || !accountData.platformId) {
                throw new Error(`WhatsApp account with ID ${channelId} is missing credentials.`);
            }
            const accessToken = await decrypt(accountData.encryptedToken);
            const phoneNumberId = accountData.platformId;

            const result = await sendWhatsAppMessage(accessToken, phoneNumberId, recipientId, message);
            
            const messageId = result.messages?.[0]?.id;
            if (!messageId) {
                throw new Error('No message ID returned from WhatsApp API.');
            }
            return { success: true, messageId };
        } else if (platform === 'Facebook') {
            if (!channelId) {
                throw new Error("Facebook channel ID is missing.");
            }

            const accountData = await dataStore.accounts.getById(channelId);
            if (!accountData) {
                throw new Error(`Facebook account with ID ${channelId} not found.`);
            }
            if (!accountData.encryptedToken || !accountData.platformId) {
                throw new Error(`Facebook account with ID ${channelId} is missing credentials.`);
            }

            const pageToken = await decrypt(accountData.encryptedToken);
            const pageId = accountData.platformId;
            const result = await sendFacebookPageMessage(pageId, pageToken, recipientId, message);

            return { success: true, messageId: result.messageId };
        } else {
            console.warn(`Sending messages via ${platform} is not yet implemented.`);
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
