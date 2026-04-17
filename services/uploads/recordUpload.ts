'use server';

import { dataStore } from '@/lib/data-store';
import { logError } from '@/lib/error-logging';

export type UploadRecord = {
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string; // userId
  filePath: string; // The web-accessible path from the PHP script
  platform: string; // e.g., 'content-creation', 'profile-picture'
  contentId: string; // The ID of the associated content/post
};

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
