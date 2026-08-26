'use server';

/**
 * @fileoverview Application error logging adapter backed by Logica logger.
 */

import { logger } from '@/logica/logger';

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
 * Sends an application error through the existing Logica logger API.
 * Logging failures are swallowed so they never hide the original application
 * error or change the response status.
 */
export async function logError(errorLog: Omit<ErrorLog, 'timestamp'>): Promise<string> {
  try {
    const response = await logger
      .type('error')
      .data({
        source: errorLog.source,
        message: errorLog.message,
        stack: errorLog.stack,
        userId: errorLog.userId,
        request: errorLog.request,
        context: errorLog.context,
      })
      .error();

    return typeof response.body?.activity === 'string' ? response.body.activity : '';
  } catch {
    return '';
  }
}
