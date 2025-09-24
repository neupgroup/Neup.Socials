
'use server';

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface ErrorLog {
  process: string;
  location: string;
  errorMessage: string;
  user?: string;
  context?: any;
}

/**
 * Logs an error to the 'errors' collection in Firestore.
 * This is a simplified and more robust version that always creates a new error document.
 * @param details - An object containing the details of the error.
 */
export async function logError(details: ErrorLog) {
  try {
    const errorsCollection = collection(db, 'errors');
    
    // Directly add the new error document without checking for duplicates.
    // This is more resilient and ensures all error occurrences are captured.
    await addDoc(errorsCollection, {
      ...details,
      timestamp: serverTimestamp(),
      count: 1, // Each log is now a unique occurrence.
    });

  } catch (error) {
    // If logging to Firestore fails, log to console as a fallback.
    // This is the last line of defense for error reporting.
    console.error("FATAL: Failed to log error to Firestore:", error);
    console.error("Original error details:", details);
  }
}
