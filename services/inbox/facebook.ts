
'use server';

import { dataStore } from '@/lib/data-store';
import { logError } from '@/lib/error-logging';
import { decrypt } from '@/lib/crypto';
import { getPageCommentById } from '@/services/facebook/comments';
import { getPageScopedProfile } from '@/services/facebook/comments';

/**
 * Processes the incoming webhook payload from Facebook.
 * @param payload The full webhook payload from Meta.
 */
export async function processFacebookWebhook(payload: any) {
    return processFacebookWebhookByType(payload, {
        includeMessaging: true,
        includeFeedChanges: true,
    });
}

export async function processFacebookMessagesWebhook(payload: any) {
    return processFacebookWebhookByType(payload, {
        includeMessaging: true,
        includeFeedChanges: false,
    });
}

export async function processFacebookFeedWebhook(payload: any) {
    return processFacebookWebhookByType(payload, {
        includeMessaging: false,
        includeFeedChanges: true,
    });
}

async function processFacebookWebhookByType(
    payload: any,
    options: { includeMessaging: boolean; includeFeedChanges: boolean }
) {
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
        const pageId = String(entry?.id ?? '');

        // Facebook entries often have 'messaging' array within entry directly for some versions,
        // or 'changes' for feed/other events.

        // Handle 'messaging' events (common for Messenger)
        if (options.includeMessaging && entry.messaging) {
            for (const messagingEvent of entry.messaging) {
                await handleMessagingEvent(pageId, messagingEvent);
            }
        }

        // Handle 'changes' events (feed, etc.)
        if (options.includeFeedChanges && entry.changes) {
            for (const change of entry.changes) {
                await handleChangeEvent(pageId, change);
            }
        }
    }
}

async function getFacebookAccountsByPageId(pageId: string) {
    if (!pageId) {
        return [];
    }

    return dataStore.accounts.findByPlatformPlatformId({
        platform: 'Facebook',
        platformId: pageId,
    });
}

async function saveIncomingFacebookItem(params: {
    accountId: string;
    contactId: string;
    contactName: string;
    text: string;
    platformMessageId: string;
    timestamp: Date;
    type?: string;
}) {
    const {
        accountId,
        contactId,
        contactName,
        text,
        platformMessageId,
        timestamp,
        type = 'text',
    } = params;

    if (!text.trim()) {
        return;
    }

    const existing = await dataStore.messages.findByPlatformMessageId(platformMessageId);
    if (existing) {
        return;
    }

    const avatar = contactName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    let conversation = await dataStore.conversations.findByContactAndChannel(contactId, accountId);

    if (!conversation) {
        conversation = await dataStore.conversations.create({
            contactId,
            contactName,
            channelId: accountId,
            platform: 'Facebook',
            lastMessage: text,
            lastMessageAt: timestamp,
            unread: true,
            avatar,
        });
    } else {
        conversation = await dataStore.conversations.update(conversation.id, {
            contactName,
            lastMessage: text,
            lastMessageAt: timestamp,
            unread: true,
            avatar: conversation.avatar || avatar,
        });
    }

    await dataStore.messages.create({
        conversationId: conversation.id,
        platformMessageId,
        text,
        sender: 'user',
        timestamp,
        type,
    });
}

async function handleMessagingEvent(pageId: string, event: any) {
    try {
        const messageText = String(event?.message?.text ?? '').trim();
        const senderId = String(event?.sender?.id ?? '');
        const rawMessageId = String(event?.message?.mid ?? event?.message?.id ?? '');

        if (!messageText || !senderId || !rawMessageId) {
            return;
        }

        if (senderId === pageId) {
            return;
        }

        const accounts = await getFacebookAccountsByPageId(pageId || String(event?.recipient?.id ?? ''));
        if (!accounts.length) {
            return;
        }

        const senderName = String(event?.sender?.name ?? '').trim() || `Facebook User ${senderId.slice(-6)}`;
        const timestamp = typeof event?.timestamp === 'number'
            ? new Date(event.timestamp)
            : new Date();

        await Promise.all(
            accounts.map(async (account) => {
                await saveIncomingFacebookItem({
                    accountId: account.id,
                    contactId: senderId,
                    contactName: senderName,
                    text: messageText,
                    platformMessageId: `fb_msg:${account.id}:${rawMessageId}`,
                    timestamp,
                    type: 'text',
                });

                await dataStore.syncLogEntries.create({
                    type: 'messages',
                    platform: 'facebook',
                    forProfile: account.id,
                    moreInfo: {
                        source: 'facebook.webhook.messages',
                        pageId,
                        senderId,
                        senderName,
                        messageId: rawMessageId,
                    },
                });
            })
        );
    } catch (error: any) {
        await logError({
            process: 'handleMessagingEvent',
            location: 'Facebook Webhook Service',
            errorMessage: error.message,
            context: { pageId, event },
        });
    }
}

async function handleFeedCommentChange(pageId: string, change: any) {
    const value = change?.value ?? {};
    const item = String(value?.item ?? '');
    const verb = String(value?.verb ?? '');

    if (item !== 'comment') {
        return;
    }

    if (verb && !['add', 'edited'].includes(verb)) {
        return;
    }

    const commenterId = String(value?.from?.id ?? '');
    if (!commenterId || commenterId === pageId) {
        return;
    }

    const commentId = String(value?.comment_id ?? value?.commentId ?? '');
    const postId = String(value?.post_id ?? value?.postId ?? '');
    let commentText = String(value?.message ?? '').trim();
    let commenterName = String(value?.from?.name ?? '').trim();
    let commenterProfilePic = '';

    const accounts = await getFacebookAccountsByPageId(pageId);
    if (!accounts.length) {
        return;
    }

    if ((!commentText || !commenterName) && commentId) {
        const primary = accounts[0];
        if (primary?.encryptedToken) {
            try {
                const token = await decrypt(primary.encryptedToken);
                const detailedComment = await getPageCommentById(commentId, token);
                commentText = commentText || String(detailedComment?.message ?? '').trim();
                commenterName = commenterName || String(detailedComment?.from?.name ?? '').trim();
            } catch {
                // Keep payload fallback values if detail lookup fails.
            }
        }
    }

    if (commenterId) {
        const primary = accounts[0];
        if (primary?.encryptedToken) {
            try {
                const token = await decrypt(primary.encryptedToken);
                const profile = await getPageScopedProfile(commenterId, token);
                const profileName = `${String(profile.first_name ?? '').trim()} ${String(profile.last_name ?? '').trim()}`.trim();
                commenterName = profileName || commenterName;
                commenterProfilePic = String(profile.profile_pic ?? '').trim();
            } catch {
                // Keep existing fallback if PSID profile lookup fails.
            }
        }
    }

    if (!commentText) {
        return;
    }

    const timestamp = value?.created_time
        ? new Date(Number(value.created_time) * 1000)
        : new Date();
    const displayName = commenterName || `Facebook User ${commenterId.slice(-6)}`;
    const inboxText = postId
        ? `Comment on ${postId}: ${commentText}`
        : `Comment: ${commentText}`;

    const primaryCommentor = await dataStore.commentors.upsertByPlatformProfileAndUser({
        platform: 'Facebook',
        onProfile: pageId,
        platformUserId: commenterId,
        name: displayName,
        firstInteraction: timestamp,
    });

    await dataStore.identityPlatform.upsertWithUnified({
        platform: 'facebook',
        platUserId: commenterId,
        name: displayName,
        moreInfo: {
            firstName: displayName.split(' ').slice(0, -1).join(' ') || displayName,
            lastName: displayName.split(' ').slice(-1)[0] || '',
            profilePic: commenterProfilePic || null,
            pageId,
            source: 'facebook.webhook.feed.comment',
        },
    });

    if (commentId) {
        const existingComment = await dataStore.comments.findByPlatformCommentId(`facebook:${pageId}:${commentId}`);
        if (!existingComment) {
            await dataStore.comments.create({
                by: primaryCommentor.id,
                onProfile: pageId,
                comment: commentText,
                on: timestamp,
                platform: 'Facebook',
                platformCommentId: `facebook:${pageId}:${commentId}`,
                postId: postId || null,
                postMessage: null,
                permalinkUrl: null,
            });
        }

        const existingFacebookComment = await dataStore.facebookComments.findExisting({
            psid: commenterId,
            comment: commentText,
            commentedOn: timestamp,
        });

        if (!existingFacebookComment) {
            await dataStore.facebookComments.create({
                psid: commenterId,
                comment: commentText,
                commentedOn: timestamp,
                moreInfo: {
                    pageId,
                    commentId,
                    postId,
                    commenterName: displayName,
                    commenterProfilePic: commenterProfilePic || null,
                    source: 'facebook.webhook.feed.comment',
                },
            });
        }
    }

    await Promise.all(
        accounts.map(async (account) => {
            await saveIncomingFacebookItem({
                accountId: account.id,
                contactId: commenterId,
                contactName: displayName,
                text: inboxText,
                platformMessageId: `fb_comment:${account.id}:${commentId || `${commenterId}:${timestamp.getTime()}`}`,
                timestamp,
                type: 'comment',
            });

            await dataStore.syncLogEntries.create({
                type: 'comments',
                platform: 'facebook',
                forProfile: account.id,
                moreInfo: {
                    source: 'facebook.webhook.feed',
                    pageId,
                    commenterId,
                    commenterName: displayName,
                    commentId,
                    postId,
                },
            });
        })
    );
}

async function handleChangeEvent(pageId: string, change: any) {
    try {
        console.log('📝 [Service] Processing change event:', change);

        const field = change?.field;

        if (field === 'feed') {
            await handleFeedCommentChange(pageId, change);
            return;
        }

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
