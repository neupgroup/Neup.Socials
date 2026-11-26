'use server';

import { buildTextSearchWhere } from '@/services/searches/text-search';
import { countUploads, getUpload, listUploads, listUploadsForLibrary, updateUpload } from '@/services/uploads';

/** Number of uploads returned per page by {@link listUploadsAction}. */
const PAGE_SIZE = 10;

/**
 * Converts an optional Date into an ISO 8601 string for safe serialization.
 * @param value - The date to convert; may be `null` or `undefined`.
 * @returns The ISO 8601 string, or `null` when no date is provided.
 */
const toIso = (value?: Date | null) => (value ? value.toISOString() : null);

/**
 * Makes an upload record serializable by converting `uploadedOn` to an ISO string.
 * @param upload - The upload returned by `getUpload`, or `null` if not found.
 * @returns The upload with `uploadedOn` as an ISO string, or `null` if no upload was given.
 */
const serializeUpload = (upload: Awaited<ReturnType<typeof getUpload>>) => upload ? { ...upload, uploadedOn: toIso(upload.uploadedOn) } : null;

/**
 * Server action that returns one page of uploads, optionally filtered by a
 * text search on `fileName` and `contentName`.
 *
 * @param params - Query options.
 * @param params.search - Optional search text matched against file and content names.
 * @param params.skip - Number of records to skip (offset). Defaults to `0`.
 * @returns A promise resolving to an object with:
 *   - `items`: up to {@link PAGE_SIZE} serialized uploads.
 *   - `hasMore`: `true` if more results exist beyond this page.
 */
export async function listUploadsAction({ search, skip = 0 }: { search?: string; skip?: number }) {
  const searchBuild = buildTextSearchWhere(search, ['fileName', 'contentName']);
  const [uploads, total] = await Promise.all([
    listUploads({ search, searchFilter: searchBuild.where, skip, take: PAGE_SIZE }),
    countUploads({ search, searchFilter: searchBuild.where }),
  ]);
  return { items: uploads.map((upload) => serializeUpload(upload)!), hasMore: skip + uploads.length < total };
}

/**
 * Server action that returns every upload for the library view (unpaginated).
 * @returns A promise resolving to all uploads with `uploadedOn` as an ISO string.
 */
export async function listAllUploadsAction() { return (await listUploadsForLibrary()).map((upload) => serializeUpload(upload)!); }

/**
 * Server action that fetches a single upload by id.
 * @param id - The upload id.
 * @returns A promise resolving to the serialized upload, or `null` if not found.
 */
export async function getUploadAction(id: string) { return serializeUpload(await getUpload(id)); }

/**
 * Server action that updates an upload's editable fields.
 * @param id - The id of the upload to update.
 * @param data - Fields to update.
 * @param data.contentName - New display name for the content, or `null` to clear it.
 * @returns A promise resolving to the updated, serialized upload.
 */
export async function updateUploadAction(id: string, data: { contentName?: string | null }) { return serializeUpload(await updateUpload(id, data)); }
