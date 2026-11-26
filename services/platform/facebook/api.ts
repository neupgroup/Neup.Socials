import { logError } from '@/services/error-logging';

/** Facebook Graph API version used for all requests. */
export const FACEBOOK_GRAPH_API_VERSION = 'v23.0';

/** Base URL for Graph API requests, including the API version. */
export const FACEBOOK_GRAPH_API_BASE_URL = `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}`;

/** Shape of an error payload returned by the Facebook Graph API. */
export type FacebookApiErrorResponse = { error?: { message?: string } };

/**
 * Performs an authenticated GET request against the Facebook Graph API and
 * returns the parsed JSON body.
 *
 * The access token is sent in the `Authorization: Bearer` header rather than
 * the query string. If the response is not OK, an `Error` is thrown using
 * Facebook's error message when available, or a generic fallback.
 *
 * @typeParam T - Expected shape of a successful response body.
 * @param url - Full Graph API URL to request.
 * @param accessToken - Access token used to authorize the request.
 * @returns A promise resolving to the parsed response body.
 * @throws {Error} If the response status is not OK.
 */
export async function getFacebookApi<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = (await response.json().catch(() => null)) as T | FacebookApiErrorResponse | null;

  if (!response.ok) {
    const message = (payload as FacebookApiErrorResponse | null)?.error?.message;
    throw new Error(message || 'Facebook Graph API request failed.');
  }

  return payload as T;
}

/**
 * Logs a Facebook API failure through the shared error logger.
 * Non-`Error` values are converted with `String()` before logging.
 * @param process - Name of the operation that failed (e.g. the function name).
 * @param location - Where the failure occurred (e.g. the endpoint).
 * @param error - The caught error or thrown value.
 * @param context - Extra data to attach to the log entry .
 * @returns A promise that resolves once the error has been logged.
 */
export async function logFacebookApiError(process: string, location: string, error: unknown, context: Record<string, unknown>) {
  await logError({
    process,
    location,
    errorMessage: error instanceof Error ? error.message : String(error),
    context,
  });
}
