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
  fromProfilePic?: string;
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

  const savedComments = await dataStore.facebookComments.listRecent({ take: 500 });
  const uniquePsids = Array.from(new Set(savedComments.map((item) => item.psid)));
  const identities = await Promise.all(
    uniquePsids.map(async (psid) => {
      const identity = await dataStore.identityPlatform.findByPlatformUserId({
        platform: 'facebook',
        platUserId: psid,
      });

      return [psid, identity] as const;
    })
  );

  const identityByPsid = new Map(identities);
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

        if (intents.includes('messages')) {
          await dataStore.syncLogEntries.create({
            type: 'messages',
            platform: 'facebook',
            forProfile: account.id,
            moreInfo: {
              accountId: account.id,
              pageId,
              pageName: account.name,
              fetchedCount: messages.length,
              source: 'listFacebookInboxFeedAction',
            },
          });
        }

        const comments = intents.includes('posts')
          ? savedComments.filter((item) => {
              const moreInfo = (item.moreInfo ?? {}) as { pageId?: string };
              return String(moreInfo.pageId ?? '') === pageId;
            })
          : [];

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

        const mappedComments: FacebookInboxItem[] = comments.map((item: (typeof savedComments)[number]) => {
          const identity = identityByPsid.get(item.psid);
          const moreInfo = (item.moreInfo ?? {}) as {
            postId?: string;
            postMessage?: string;
            permalinkUrl?: string;
            commenterName?: string;
            commenterProfilePic?: string;
          };
          const name = identity?.unified?.name || moreInfo.commenterName || `Facebook User ${item.psid.slice(-6)}`;
          const profilePic =
            typeof identity?.unified?.moreInfo === 'object' && identity?.unified?.moreInfo
              ? String((identity.unified.moreInfo as { profilePic?: string }).profilePic ?? '')
              : String(moreInfo.commenterProfilePic ?? '');

          return {
            id: `comment_${item.id}`,
            type: 'comment',
            pageId,
            pageName: account.name || 'Facebook Page',
            fromId: item.psid,
            fromName: name,
            fromProfilePic: profilePic || undefined,
            text: item.comment,
            createdTime: item.commentedOn.toISOString(),
            postId: moreInfo.postId ?? undefined,
            postMessage: moreInfo.postMessage ?? undefined,
            postPermalinkUrl: moreInfo.permalinkUrl ?? undefined,
          };
        });

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
