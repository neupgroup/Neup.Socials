
'use server';

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
    console.log('📝 [Service] Processing change event:', change);
    // TODO: Implement handling for feed changes, comments, etc.
}
