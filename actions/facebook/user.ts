'use server';

import { dataStore } from '@/lib/data-store';

type FacebookUserAccountOption = {
  id: string;
  name: string;
  pageId: string;
};

type FacebookUserComment = {
  id: string;
  text: string;
  commentedOn: string;
  pageName?: string;
};

export type FacebookUserProfile = {
  psid: string;
  name: string;
  profilePic?: string;
  accountOptions: FacebookUserAccountOption[];
  recentComments: FacebookUserComment[];
};

const asObject = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }

  return {};
};

export async function getFacebookUserProfileAction(psid: string): Promise<FacebookUserProfile> {
  const normalizedPsid = String(psid || '').trim();
  if (!normalizedPsid) {
    throw new Error('User id is required.');
  }

  const identity = await dataStore.identityPlatform.findByPlatformUserId({
    platform: 'facebook',
    platUserId: normalizedPsid,
  });

  const allComments = await dataStore.facebookComments.listRecent({ take: 1000 });
  const comments = allComments.filter((comment) => comment.psid === normalizedPsid).slice(0, 100);

  const commentMetadata = comments.map((comment) => asObject(comment.moreInfo));
  const latestMeta = commentMetadata[0] ?? {};

  const pageIds = Array.from(
    new Set(
      commentMetadata
        .map((meta) => String(meta.pageId ?? '').trim())
        .filter(Boolean)
    )
  );

  const allFacebookAccounts = (await dataStore.accounts.list({ take: 500 })).filter(
    (account) => account.platform === 'Facebook' && account.platformId
  );

  const accounts = allFacebookAccounts
    .filter((account) => pageIds.includes(String(account.platformId)))
    .map((account) => ({
      id: account.id,
      name: account.name || account.username || 'Facebook Page',
      pageId: String(account.platformId),
    }));

  const moreInfo = asObject(identity?.unified?.moreInfo);
  const profilePicFromIdentity = String(moreInfo.profilePic ?? '').trim();
  const profilePicFromComment = String(latestMeta.commenterProfilePic ?? '').trim();

  const nameFromIdentity = String(identity?.unified?.name ?? '').trim();
  const nameFromComment = String(latestMeta.commenterName ?? '').trim();

  const recentComments: FacebookUserComment[] = comments.map((comment) => {
    const info = asObject(comment.moreInfo);
    return {
      id: comment.id,
      text: comment.comment,
      commentedOn: comment.commentedOn.toISOString(),
      pageName: String(info.pageName ?? '').trim() || undefined,
    };
  });

  return {
    psid: normalizedPsid,
    name: nameFromIdentity || nameFromComment || `Facebook User ${normalizedPsid.slice(-6)}`,
    profilePic: profilePicFromIdentity || profilePicFromComment || undefined,
    accountOptions: accounts,
    recentComments,
  };
}