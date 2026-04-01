'use server';

import { decrypt } from '@/lib/crypto';
import { dataStore } from '@/lib/data-store';
import { logError } from '@/lib/error-logging';
import { getPagePostComments } from '@/core/facebook/comments';
import { getPageConversationsWithMessages } from '@/core/facebook/messages';

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

  const perAccountResults = await Promise.all(
    facebookAccounts.map(async (account) => {
      try {
        const pageId = account.platformId as string;
        const pageToken = await decrypt(account.encryptedToken as string);

        const [messages, comments] = await Promise.all([
          getPageConversationsWithMessages(pageId, pageToken),
          getPagePostComments(pageId, pageToken),
        ]);

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

        const mappedComments: FacebookInboxItem[] = comments.map((item) => ({
          id: `comment_${item.commentId}`,
          type: 'comment',
          pageId,
          pageName: account.name || 'Facebook Page',
          fromId: item.commenterId,
          fromName: item.commenterName,
          text: item.commentText,
          createdTime: item.createdTime,
          postId: item.postId,
          postMessage: item.postMessage,
          postPermalinkUrl: item.permalinkUrl,
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
