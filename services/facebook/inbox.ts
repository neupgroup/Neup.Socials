'use server';

import { dataStore } from '@/core/lib/data-store';
import { logError } from '@/core/lib/error-logging';

export type FacebookInboxItem = {
  id: string;
  type: 'message' | 'comment';
  accountId: string;
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
    (account) => account.platform === 'Facebook' && account.platformId
  );

  if (!facebookAccounts.length) {
    return [];
  }

  const accountById = new Map(facebookAccounts.map((account) => [account.id, account]));
  const pageIds = facebookAccounts.map((account) => String(account.platformId));
  const accountIds = facebookAccounts.map((account) => account.id);

  const savedComments: Array<{
    id: string;
    psid: string;
    comment: string;
    commentedOn: Date;
    moreInfo: unknown;
  }> = await dataStore.facebookComments.listRecent({ take: 500 });
  const commentors = await dataStore.commentors.listByPlatformAndProfiles({
    platform: 'Facebook',
    onProfiles: pageIds,
    take: 2000,
  });
  const commentorByPageAndPsid = new Map<string, (typeof commentors)[number]>(
    commentors.map((item: (typeof commentors)[number]): [string, (typeof commentors)[number]] => [
      `${item.onProfile}:${item.platformUserId}`,
      item,
    ])
  );

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

  const conversations = await dataStore.conversations.listByChannelIds({
    channelIds: accountIds,
    take: 400,
  });
  const conversationById = new Map(conversations.map((conversation) => [conversation.id, conversation]));
  const latestMessages = await dataStore.messages.listByConversationIds({
    conversationIds: conversations.map((item) => item.id),
    take: 1200,
  });

  const latestByConversation = new Map<string, (typeof latestMessages)[number]>();
  for (const message of latestMessages) {
    if (!latestByConversation.has(message.conversationId)) {
      latestByConversation.set(message.conversationId, message);
    }
  }

  const mappedMessages: FacebookInboxItem[] = conversations
    .map((conversation) => {
      const account = accountById.get(conversation.channelId);
      if (!account) {
        return null;
      }

      const latest = latestByConversation.get(conversation.id);
      if (!latest) {
        return null;
      }

      return {
        id: `message_${conversation.id}`,
        type: latest.type === 'comment' ? 'comment' : 'message',
        accountId: account.id,
        pageId: String(account.platformId),
        pageName: account.name || 'Facebook Page',
        fromId: conversation.contactId,
        fromName: conversation.contactName || `Facebook User ${conversation.contactId.slice(-6)}`,
        text: latest.text,
        createdTime: latest.timestamp.toISOString(),
      } as FacebookInboxItem;
    })
    .filter((item): item is FacebookInboxItem => item !== null);

  const perAccountResults = await Promise.all(
    facebookAccounts.map(async (account) => {
      try {
        const pageId = account.platformId as string;
        const comments = savedComments.filter((item) => {
          const moreInfo = (item.moreInfo ?? {}) as { pageId?: string };
          return String(moreInfo.pageId ?? '') === pageId;
        });

        const mappedComments: FacebookInboxItem[] = comments.map((item: (typeof savedComments)[number]) => {
          const identity = identityByPsid.get(item.psid);
          const moreInfo = (item.moreInfo ?? {}) as {
            postId?: string;
            postMessage?: string;
            permalinkUrl?: string;
            commenterName?: string;
            commenterProfilePic?: string;
          };
          const commentor = commentorByPageAndPsid.get(`${pageId}:${item.psid}`);
          const name =
            commentor?.name ||
            identity?.unified?.name ||
            moreInfo.commenterName ||
            `Facebook User ${item.psid.slice(-6)}`;
          const profilePic =
            typeof identity?.unified?.moreInfo === 'object' && identity?.unified?.moreInfo
              ? String((identity.unified.moreInfo as { profilePic?: string }).profilePic ?? '')
              : String(moreInfo.commenterProfilePic ?? '');

          return {
            id: `comment_${item.id}`,
            type: 'comment',
            accountId: account.id,
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

        return mappedComments;
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

  return [...mappedMessages, ...perAccountResults.flat()]
    .flat()
    .sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
}
