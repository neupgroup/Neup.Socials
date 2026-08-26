'use server';

/**
 * @fileoverview A centralized service adapter for the Logica error logger.
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
 * Logs an error through Logica's centralized logger.
 * @param errorLog - An object containing the details of the error to be logged.
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

    return typeof response.activity === 'string' ? response.activity : '';
  } catch (loggingError) {
    // Logging must not hide the original application error.
    console.error('FATAL: Failed to send error to Logica.', loggingError);
    console.error('Original Error:', errorLog);
    // In a production environment, you might want to send this to a more robust, secondary logging service.
    return '';
  }
}
