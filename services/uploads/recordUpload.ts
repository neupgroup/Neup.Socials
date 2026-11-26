'use server';

import { dataStore } from '@/services/repositories';
import { logError } from '@/services/error-logging';

/**
 * Metadata describing a file that has been uploaded and needs to be recorded.
 */
export type UploadRecord = {
  /** Original name of the uploaded file. */
  fileName: string;
  /** File size . */
  fileSize: number;
  /** MIME type of the file, e.g. `image/png`. */
  fileType: string;
  /** Id of the user who uploaded the file. */
  uploadedBy: string; // userId
  /** Web-accessible path of the file, as returned by the PHP upload script. */
  filePath: string; // The web-accessible path from the PHP script
  /** Upload context, e.g. `'content-creation'` or `'profile-picture'`. */
  platform: string; // e.g., 'content-creation', 'profile-picture'
  /** Id of the content/post the file is associated with. */
  contentId: string; // The ID of the associated content/post
};

/**
 * Server action that persists an upload's metadata to the data store,
 * stamping it with the current time as `uploadedOn`.
 *
 * On failure the error is logged via `logError` (including the user and the
 * upload data as context) and a generic failure result is returned instead of
 * throwing.
 *
 * @param data - The upload metadata to record.
 * @returns A promise resolving to either:
 *   - `{ success: true, id }` where `id` is the new upload record's id, or
 *   - `{ success: false, error }` with a user-safe error message.
 */
export async function recordUpload(data: UploadRecord) {
  try {
    const upload = await dataStore.uploads.create({
      ...data,
      uploadedOn: new Date(),
    });
    return { success: true, id: upload.id };
  } catch (error: any) {
    console.error('Error recording upload to Firestore:', error);
    await logError({
      process: 'recordUpload',
      location: 'Uploads Action',
      errorMessage: error.message,
      user: data.uploadedBy,
      context: { uploadData: data },
    });
    return { success: false, error: 'Failed to record upload in database.' };
  }
}
