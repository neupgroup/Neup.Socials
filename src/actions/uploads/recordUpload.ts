'use server';

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
    const docRef = await addDoc(collection(db, 'uploads'), {
      ...data,
      uploadedOn: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
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
