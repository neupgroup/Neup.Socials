'use server';

import { decrypt } from '@/lib/crypto';
import { dataStore } from '@/lib/data-store';
import { logError } from '@/lib/error-logging';
import { getPageConversationsWithMessages } from '@/core/facebook/messages';
import { type FacebookAuthIntent } from './auth-intents';

export type FacebookInboxItem = {
  id: string;
  type: 'message' | 'comment';
  pageId: string;
  pageName: string;
  fromId: string;
  fromName: string;
  text: string;
  createdTime: string;
  postId?: string;
  postMessage?: string;
  postPermalinkUrl?: string;
};

export async function listFacebookInboxFeedAction(): Promise<FacebookInboxItem[]> {
  const accounts = await dataStore.accounts.list({ take: 200 });
  const facebookAccounts = accounts.filter(
    (account) => account.platform === 'Facebook' && account.platformId && account.encryptedToken
  );

  const pageIds = facebookAccounts.map((account) => account.platformId as string);
  const savedComments = pageIds.length
    ? await dataStore.comments.listByPlatformAndProfiles({
        platform: 'Facebook',
        onProfiles: pageIds,
        take: 500,
      })
    : [];

  const commentsByPageId = new Map<string, typeof savedComments>();
  for (const comment of savedComments) {
    const existing = commentsByPageId.get(comment.onProfile);
    if (existing) {
      existing.push(comment);
    } else {
      commentsByPageId.set(comment.onProfile, [comment]);
    }
  }

  const perAccountResults = await Promise.all(
    facebookAccounts.map(async (account) => {
      try {
        const pageId = account.platformId as string;
        const accountMetadata = (account.metadata ?? {}) as { authIntents?: FacebookAuthIntent[] };
        const intents = Array.isArray(accountMetadata.authIntents) && accountMetadata.authIntents.length > 0
          ? accountMetadata.authIntents
          : (['posts'] as FacebookAuthIntent[]);

        const messages = intents.includes('messages')
          ? await getPageConversationsWithMessages(pageId, await decrypt(account.encryptedToken as string))
          : [];

        const comments = intents.includes('posts') ? (commentsByPageId.get(pageId) ?? []) : [];

        const mappedMessages: FacebookInboxItem[] = messages.map((item) => ({
          id: `message_${item.messageId}`,
          type: 'message',
          pageId,
          pageName: account.name || 'Facebook Page',
          fromId: item.senderId,
          fromName: item.senderName,
          text: item.text,
          createdTime: item.createdTime,
        }));

        const mappedComments: FacebookInboxItem[] = comments.map((item: (typeof savedComments)[number]) => ({
          id: `comment_${item.id}`,
          type: 'comment',
          pageId,
          pageName: account.name || 'Facebook Page',
          fromId: item.commentor.platformUserId,
          fromName: item.commentor.name,
          text: item.comment,
          createdTime: item.on.toISOString(),
          postId: item.postId ?? undefined,
          postMessage: item.postMessage ?? undefined,
          postPermalinkUrl: item.permalinkUrl ?? undefined,
        }));

        return [...mappedMessages, ...mappedComments];
      } catch (error: any) {
        await logError({
          process: 'listFacebookInboxFeedAction',
          location: 'actions/facebook/inbox.ts',
          errorMessage: error?.message || 'Failed to read Facebook inbox feed.',
          context: {
            accountId: account.id,
            pageId: account.platformId,
            pageName: account.name,
          },
        });

        return [];
      }
    })
  );

  return perAccountResults
    .flat()
    .sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
}
