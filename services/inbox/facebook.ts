
'use server';

import { dataStore } from '@/lib/data-store';
import { logError } from '@/lib/error-logging';

/**
 * Processes the incoming webhook payload from Facebook.
 * @param payload The full webhook payload from Meta.
 */
export async function processFacebookWebhook(payload: any) {
    console.log('⚡ [Service] Starting Facebook webhook processing...');

    // Basic structure check - FB webhooks usually have 'object': 'page' or similar
    if (payload.object !== 'page') {
        console.log('⚠️ [Service] Webhook is not from a Facebook Page, skipping (or handle distinct object type).');
        // Note: It might be 'instagram' or others depending on app setup, 
        // but 'page' is standard for FB Page webhooks.
        return;
    }

    if (!payload.entry || !payload.entry.length) {
        console.log('⚠️ [Service] Payload entry matches no expected format.');
        return;
    }

    for (const entry of payload.entry) {
        // Facebook entries often have 'messaging' array within entry directly for some versions,
        // or 'changes' for feed/other events.

        // Handle 'messaging' events (common for Messenger)
        if (entry.messaging) {
            for (const messagingEvent of entry.messaging) {
                await handleMessagingEvent(messagingEvent);
            }
        }

        // Handle 'changes' events (feed, etc.)
        if (entry.changes) {
            for (const change of entry.changes) {
                await handleChangeEvent(change);
            }
        }
    }
}

async function handleMessagingEvent(event: any) {
    console.log('💬 [Service] Processing messaging event:', event);
    // TODO: Implement actual message handling (find/create conversation, add message)
    // For now, we'll just log it clearly or maybe save raw event if useful
}

async function handleChangeEvent(change: any) {
    try {
        console.log('📝 [Service] Processing change event:', change);

        const field = change?.field;

        if (field === 'page_change_proposal' || field === 'page_upcoming_change') {
            const value = change?.value ?? {};

            await dataStore.systemAlerts.create({
                type: field,
                platform: 'Facebook',
                payload: {
                    field,
                    pageId: value?.page_id ?? value?.page ?? null,
                    proposalId: value?.proposal_id ?? value?.id ?? null,
                    verb: value?.verb ?? null,
                    actorId: value?.actor_id ?? null,
                    effectiveTime: value?.effective_time ?? null,
                    raw: value,
                },
                timestamp: new Date(),
            });

            return;
        }

        // Keep other change types as logs for now; this service can be extended incrementally.
    } catch (error: any) {
        await logError({
            process: 'handleChangeEvent',
            location: 'Facebook Webhook Service',
            errorMessage: error.message,
            context: { change },
        });
    }
}
