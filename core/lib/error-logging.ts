
'use server';

import { dataStore } from '@/core/lib/data-store';

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
    await dataStore.errors.create({
      ...details,
      timestamp: new Date(),
      count: 1,
    });

  } catch (error) {
    // If logging to Firestore fails, log to console as a fallback.
    // This is the last line of defense for error reporting.
    console.error("FATAL: Failed to log error to Firestore:", error);
    console.error("Original error details:", details);
  }
}
