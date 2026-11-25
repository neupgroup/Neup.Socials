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

/**
 * Converts an optional Date into an ISO 8601 string so it can be safely
 * passed from server actions to client components.
 * @param value The date to convert, or null/undefined if not set.
 * @returns The ISO string representation of the date, or null if no date was given.
 */
const toIso = (value?: Date | null) => (value ? value.toISOString() : null);

/**
 * Converts a post record into a plain, serializable object by turning its
 * `createdOn` date into an ISO string.
 * @param post The post record returned by getPost, or null if none was found.
 * @returns The post with `createdOn` serialized, or null if no post was provided.
 */
const serializePost = (post: Awaited<ReturnType<typeof getPost>>) => post ? { ...post, createdOn: toIso(post.createdOn) } : null;

/**
 * Converts a post collection record into a plain, serializable object by
 * turning its `createdAt`, `publishedAt`, and `scheduledAt` dates into ISO strings.
 * @param postCollection The post collection returned by getPostCollection, or null if none was found.
 * @returns The post collection with its date fields serialized, or null if none was provided.
 */
const serializePostCollection = (postCollection: Awaited<ReturnType<typeof getPostCollection>>) =>
  postCollection ? { ...postCollection, createdAt: toIso(postCollection.createdAt), publishedAt: toIso(postCollection.publishedAt), scheduledAt: toIso(postCollection.scheduledAt) } : null;

/**
 * Server action to list posts one page at a time, with optional text search
 * on the post message and optional filtering by account. Each post is returned
 * with a display name for the account that published it.
 * @param params.search Optional search text matched against the post message.
 * @param params.accountId Optional account ID to restrict the posts to.
 * @param params.skip Number of posts to skip, used for pagination. Defaults to 0.
 * @returns An object with `items` (the serialized posts for this page, each with an
 * `accountName` taken from the account's name, username, the post's creator, or
 * "Unknown account") and `hasMore` (true if more posts exist beyond this page).
 */
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

/**
 * Server action to fetch a single post by its ID.
 * @param id The ID of the post.
 * @returns The serialized post, or null if it was not found.
 */
export async function getPostAction(id: string) { return serializePost(await getPost(id)); }

/**
 * Server action to delete a single post.
 * @param id The ID of the post to delete.
 * @returns An object with `success: true` once the post has been deleted.
 */
export async function deletePostAction(id: string) { await deletePost(id); return { success: true }; }

/**
 * Server action to fetch a single post collection by its ID.
 * @param id The ID of the post collection.
 * @returns The serialized post collection, or null if it was not found.
 */
export async function getPostCollectionAction(id: string) { return serializePostCollection(await getPostCollection(id)); }

/**
 * Server action to create a new post collection, typically as a draft.
 * @param data The post collection details to store.
 * @param data.content The text content of the post.
 * @param data.mediaUrls URLs of the media attached to the post.
 * @param data.status The status of the collection (for example, Draft).
 * @param data.author Optional author of the post.
 * @param data.postsId Optional IDs of the posts that belong to the collection.
 * @param data.accountIds Optional IDs of the accounts the collection targets.
 * @param data.platforms Optional platforms the collection targets.
 * @param data.ctaType Optional call-to-action type.
 * @param data.ctaLink Optional call-to-action link.
 * @returns The newly created post collection, serialized.
 */
export async function createPostCollectionDraftAction(data: {
  content: string; mediaUrls: string[]; status: string; author?: string | null; postsId?: string[]; accountIds?: string[]; platforms?: string[]; ctaType?: string | null; ctaLink?: string | null;
}) { return serializePostCollection(await createPostCollection(data)); }

/**
 * Server action to update an existing post collection. Date values are passed
 * as ISO strings and converted to Dates before saving.
 * @param id The ID of the post collection to update.
 * @param data The fields to change; fields left out are not modified.
 * @param data.content Optional new text content.
 * @param data.mediaUrls Optional new media URLs.
 * @param data.status Optional new status.
 * @param data.author Optional new author.
 * @param data.postsId Optional new list of post IDs.
 * @param data.accountIds Optional new list of account IDs.
 * @param data.platforms Optional new list of platforms.
 * @param data.ctaType Optional new call-to-action type.
 * @param data.ctaLink Optional new call-to-action link.
 * @param data.publishedAt Optional ISO timestamp of publication; null or an empty value clears it.
 * @param data.scheduledAt Optional ISO timestamp of the scheduled time; null or an empty value clears it.
 * @returns The updated post collection, serialized.
 */
export async function updatePostCollectionAction(id: string, data: {
  content?: string; mediaUrls?: string[]; status?: string; author?: string | null; postsId?: string[]; accountIds?: string[]; platforms?: string[]; ctaType?: string | null; ctaLink?: string | null; publishedAt?: string | null; scheduledAt?: string | null;
}) {
  return serializePostCollection(await updatePostCollection(id, {
    ...data,
    publishedAt: data.publishedAt === undefined ? undefined : data.publishedAt ? new Date(data.publishedAt) : null,
    scheduledAt: data.scheduledAt === undefined ? undefined : data.scheduledAt ? new Date(data.scheduledAt) : null,
  }));
}

/**
 * Server action to cancel a scheduled post collection by moving it back to
 * Draft status and clearing its scheduled time.
 * @param id The ID of the post collection to cancel.
 * @returns The updated post collection, serialized.
 */
export async function cancelScheduledPostCollectionAction(id: string) {
  return serializePostCollection(await updatePostCollection(id, { status: 'Draft', scheduledAt: null }));
}

/**
 * Server action to delete a post collection.
 * @param id The ID of the post collection to delete.
 * @returns An object with `success: true` once the collection has been deleted.
 */
export async function deletePostCollectionAction(id: string) { await deletePostCollection(id); return { success: true }; }

/**
 * Server action to fetch the posts that belong to a post collection.
 * @param ids The IDs of the posts to fetch.
 * @returns An array of the matching posts, serialized.
 */
export async function getPostCollectionPostsAction(ids: string[]) { return (await getPostsByIds(ids)).map((post) => serializePost(post)!); }

/**
 * Server action to find the post collections that use a given media file.
 * @param filePath The media URL or file path to search for.
 * @returns An array of the post collections that reference the file, serialized.
 */
export async function getPostCollectionsByMediaUrlAction(filePath: string) { return (await findPostCollectionsByMediaUrl(filePath)).map((item) => serializePostCollection(item)!); }
