'use server';

import { buildTextSearchWhere } from '@/services/searches/text-search';
import {
  countPosts,
  createPostCollection,
  deletePost,
  deletePostCollection,
  findPostCollectionsByMediaUrl,
  getPost,
  getPostCollection,
  getPostsByIds,
  listPosts,
  updatePostCollection,
} from '@/services/posts';
import { getAccountsByIds } from '@/services/accounts';

const PAGE_SIZE = 15;
const toIso = (value?: Date | null) => (value ? value.toISOString() : null);
const serializePost = (post: Awaited<ReturnType<typeof getPost>>) => post ? { ...post, createdOn: toIso(post.createdOn) } : null;
const serializePostCollection = (postCollection: Awaited<ReturnType<typeof getPostCollection>>) =>
  postCollection ? { ...postCollection, createdAt: toIso(postCollection.createdAt), publishedAt: toIso(postCollection.publishedAt), scheduledAt: toIso(postCollection.scheduledAt) } : null;

export async function listPostsAction({ search, accountId, skip = 0 }: { search?: string; accountId?: string; skip?: number }) {
  const searchBuild = buildTextSearchWhere(search, ['message']);
  const [posts, total] = await Promise.all([
    listPosts({ search, searchFilter: searchBuild.where, accountId, skip, take: PAGE_SIZE }),
    countPosts({ search, searchFilter: searchBuild.where, accountId }),
  ]);
  const accountIds = Array.from(new Set(posts.map((post) => post.accountId).filter(Boolean) as string[]));
  const accounts = accountIds.length ? await getAccountsByIds(accountIds) : [];
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  return {
    items: posts.map((post) => {
      const account = post.accountId ? accountById.get(post.accountId) : undefined;
      return { ...serializePost(post)!, accountName: account?.name?.trim() || account?.username?.trim() || post.createdBy?.trim() || 'Unknown account' };
    }),
    hasMore: skip + posts.length < total,
  };
}

export async function getPostAction(id: string) { return serializePost(await getPost(id)); }
export async function deletePostAction(id: string) { await deletePost(id); return { success: true }; }
export async function getPostCollectionAction(id: string) { return serializePostCollection(await getPostCollection(id)); }

export async function createPostCollectionDraftAction(data: {
  content: string; mediaUrls: string[]; status: string; author?: string | null; postsId?: string[]; accountIds?: string[]; platforms?: string[]; ctaType?: string | null; ctaLink?: string | null;
}) { return serializePostCollection(await createPostCollection(data)); }

export async function updatePostCollectionAction(id: string, data: {
  content?: string; mediaUrls?: string[]; status?: string; author?: string | null; postsId?: string[]; accountIds?: string[]; platforms?: string[]; ctaType?: string | null; ctaLink?: string | null; publishedAt?: string | null; scheduledAt?: string | null;
}) {
  return serializePostCollection(await updatePostCollection(id, {
    ...data,
    publishedAt: data.publishedAt === undefined ? undefined : data.publishedAt ? new Date(data.publishedAt) : null,
    scheduledAt: data.scheduledAt === undefined ? undefined : data.scheduledAt ? new Date(data.scheduledAt) : null,
  }));
}

export async function cancelScheduledPostCollectionAction(id: string) {
  return serializePostCollection(await updatePostCollection(id, { status: 'Draft', scheduledAt: null }));
}
export async function deletePostCollectionAction(id: string) { await deletePostCollection(id); return { success: true }; }
export async function getPostCollectionPostsAction(ids: string[]) { return (await getPostsByIds(ids)).map((post) => serializePost(post)!); }
export async function getPostCollectionsByMediaUrlAction(filePath: string) { return (await findPostCollectionsByMediaUrl(filePath)).map((item) => serializePostCollection(item)!); }
