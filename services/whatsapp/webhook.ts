'use server';

import { logError } from '@/core/lib/error-logging';
import { handleWhatsAppAccountAlerts, handleWhatsAppAccountReviewUpdate, handleWhatsAppAccountSettingsUpdate } from '@/services/whatsapp/webhook.account-update';
import { handleWhatsAppCalls, handleWhatsAppMessages } from '@/services/whatsapp/webhook.get-messages';

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
                        await handleWhatsAppMessages(value);
                        break;
                    case 'calls':
                        await handleWhatsAppCalls(value);
                        break;
                    case 'account_alerts':
                        await handleWhatsAppAccountAlerts(value);
                        break;
                    case 'account_review_update':
                        await handleWhatsAppAccountReviewUpdate(value);
                        break;
                    case 'account_settings_update':
                        await handleWhatsAppAccountSettingsUpdate(value);
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
