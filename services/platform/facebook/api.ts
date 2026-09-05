import { logError } from '@/services/error-logging';

export const FACEBOOK_GRAPH_API_VERSION = 'v23.0';
export const FACEBOOK_GRAPH_API_BASE_URL = `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}`;

export type FacebookApiErrorResponse = { error?: { message?: string } };

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

export async function logFacebookApiError(process: string, location: string, error: unknown, context: Record<string, unknown>) {
  await logError({
    process,
    location,
    errorMessage: error instanceof Error ? error.message : String(error),
    context,
  });
}
