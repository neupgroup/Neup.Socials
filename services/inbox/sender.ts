'use server';

import { logError } from "@/core/lib/error-logging";
import { sendTextMessage as sendWhatsAppMessage } from '@/services/whatsapp/api.send-message';
import { sendPageTextMessage as sendFacebookPageMessage } from "@/services/facebook/messages";
import { dataStore } from "@/core/lib/data-store";
import { decrypt } from "@/core/lib/crypto";
import { recordOutgoingMessageAction } from "@/services/db";

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
 * @param commentId Optional platform ID of the comment if this is a private reply to a comment.
 * @returns A result object indicating success or failure.
 */
export async function sendReplyAction(
    platform: string,
    channelId: string,
    recipientId: string,
    message: string,
    contactName?: string,
    commentId?: string,
    pageId?: string
): Promise<SendMessageResult> {
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
            const resolvedPageId = pageId || accountData.platformId;
            if (!resolvedPageId) {
                throw new Error(`Facebook account with ID ${channelId} is missing a page ID.`);
            }

            let result;
            if (commentId && pageId) {
                // Use the Send API for comment-to-private-message flows when the page ID is provided.
                result = await sendFacebookPageMessage(resolvedPageId, pageToken, recipientId, message);
            } else if (commentId) {
                // Fall back to the private replies endpoint when only comment ID is available.
                const { sendFacebookPrivateReply } = await import('@/services/facebook/api');
                result = await sendFacebookPrivateReply(commentId, pageToken, message);
            } else {
                // Fallback to standard Messaging API
                result = await sendFacebookPageMessage(resolvedPageId, pageToken, recipientId, message);
            }

            await recordOutgoingMessageAction({
                channelId,
                contactId: recipientId,
                contactName: contactName || `Facebook User ${recipientId.slice(-6)}`,
                platform: 'Facebook',
                text: message,
            });

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
            context: { platform, channelId, recipientId, commentId },
        });
        return { success: false, error: error.message };
    }
}
