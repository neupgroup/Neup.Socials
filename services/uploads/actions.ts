'use server';

import { buildTextSearchWhere } from '@/services/searches/text-search';
import { countUploads, getUpload, listUploads, listUploadsForLibrary, updateUpload } from '@/services/uploads';

const PAGE_SIZE = 10;
const toIso = (value?: Date | null) => (value ? value.toISOString() : null);
const serializeUpload = (upload: Awaited<ReturnType<typeof getUpload>>) => upload ? { ...upload, uploadedOn: toIso(upload.uploadedOn) } : null;

export async function listUploadsAction({ search, skip = 0 }: { search?: string; skip?: number }) {
  const searchBuild = buildTextSearchWhere(search, ['fileName', 'contentName']);
  const [uploads, total] = await Promise.all([
    listUploads({ search, searchFilter: searchBuild.where, skip, take: PAGE_SIZE }),
    countUploads({ search, searchFilter: searchBuild.where }),
  ]);
  return { items: uploads.map((upload) => serializeUpload(upload)!), hasMore: skip + uploads.length < total };
}
export async function listAllUploadsAction() { return (await listUploadsForLibrary()).map((upload) => serializeUpload(upload)!); }
export async function getUploadAction(id: string) { return serializeUpload(await getUpload(id)); }
export async function updateUploadAction(id: string, data: { contentName?: string | null }) { return serializeUpload(await updateUpload(id, data)); }
