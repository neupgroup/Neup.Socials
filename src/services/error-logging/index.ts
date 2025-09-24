'use server';

/**
 * @fileoverview A centralized service for logging application errors to Firestore.
 */

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type ErrorLog = {
  timestamp: any;
  source: string; // e.g., 'handleFacebookCallback', 'generatePostVariationsAction'
  message: string;
  stack?: string;
  userId?: string;
  request?: {
    url?: string;
    method?: string;
    headers?: any;
    body?: any;
  };
  context?: any; // For any other relevant information
};

/**
 * Logs an error to the 'errors' collection in Firestore.
 * @param errorLog - An object containing the details of the error to be logged.
 */
export async function logError(errorLog: Omit<ErrorLog, 'timestamp'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'errors'), {
      ...errorLog,
      timestamp: serverTimestamp(),
    });
    console.log('Error logged with ID: ', docRef.id);
    return docRef.id;
  } catch (loggingError: any) {
    // If logging to Firestore fails, log to console as a fallback.
    console.error('FATAL: Failed to log error to Firestore.', loggingError);
    console.error('Original Error:', errorLog);
    // In a production environment, you might want to send this to a more robust, secondary logging service.
    return '';
  }
}
