'use server';

/**
 * @fileoverview Application error logging adapter backed by Logica's logger object.
 */

import { logger } from '#/logica/logger';

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
