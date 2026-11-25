'use server';

/**
 * @fileoverview Application error logging adapter backed by Logica's logger object.
 */

import { logger } from '@neup/logica/logger';

/**
 * Describes an application error entry, including where it happened, what
 * went wrong, and the request or user it relates to.
 */
export type ErrorLog = {
  timestamp: any;
  source?: string; // e.g., 'handleFacebookCallback', 'generatePostVariationsAction'
  process?: string;
  message?: string;
  errorMessage?: string;
  stack?: string;
  userId?: string;
  user?: string;
  location?: string;
  request?: {
    url?: string;
    method?: string;
    headers?: any;
    body?: any;
  };
  context?: any; // For any other relevant information
};

/**
 * Sends an application error through the Logica logger object API.
 * Logging failures are swallowed so they never hide the original application
 * error or change the response status.
 * @param errorLog The error details to log, without a timestamp. `process` falls
 * back to `source`, `message` falls back to `errorMessage`, and `userId` falls back to `user`.
 * @returns The activity ID of the logged entry, or an empty string if the logger
 * returned none or logging failed.
 */
export async function logError(errorLog: Omit<ErrorLog, 'timestamp'>): Promise<string> {
  try {
    const process = errorLog.process || errorLog.source || 'application-error';
    const response = await logger
      .type('error')
      .data({
        process,
        location: errorLog.location,
        message: errorLog.message || errorLog.errorMessage || 'Unknown error',
        stack: errorLog.stack,
        userId: errorLog.userId || errorLog.user,
        request: errorLog.request,
        context: errorLog.context,
      })
      .error();

    return typeof response.body?.activity === 'string' ? response.body.activity : '';
  } catch {
    return '';
  }
}
