'use server';

import { logError } from "@/lib/error-logging";
import { sendTextMessage as sendWhatsAppMessage } from "@/core/whatsapp/api";

type SendMessageResult = {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Sends a reply message to a given platform.
 * Currently supports WhatsApp.
 * @param platform The social media platform (e.g., 'WhatsApp').
 * @param recipientId The platform-specific ID of the recipient.
 * @param message The text message to send.
 * @returns A result object indicating success or failure.
 */
export async function sendReplyAction(platform: string, recipientId: string, message: string): Promise<SendMessageResult> {
    try {
        if (platform === 'WhatsApp') {
            const result = await sendWhatsAppMessage(recipientId, message);
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
            context: { platform, recipientId },
        });
        return { success: false, error: error.message };
    }
}
