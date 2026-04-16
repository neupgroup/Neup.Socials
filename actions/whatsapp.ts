'use server';

import { logError } from '@/lib/error-logging';

type ActionResult = {
  success: boolean;
  data?: unknown;
  error?: string;
};

const GRAPH_BASE_URL = 'https://graph.facebook.com/v25.0';

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error ?? 'Unknown error');
}

export async function addPreverifiedWhatsAppNumberAction({
  businessAccountId,
  phoneNumber,
  accessToken,
}: {
  businessAccountId: string;
  phoneNumber: string;
  accessToken?: string;
}): Promise<ActionResult> {
  if (!businessAccountId || !phoneNumber) {
    return { success: false, error: 'Business Account ID and phone number are required.' };
  }

  const token = accessToken || process.env.WHATSAPP_SYSTEM_USER_TOKEN;
  if (!token) {
    return { success: false, error: 'Missing WhatsApp system user token in environment.' };
  }

  try {
    const response = await fetch(`${GRAPH_BASE_URL}/${businessAccountId}/add_phone_numbers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone_number: phoneNumber }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        error: (data as { error?: { message?: string } })?.error?.message || 'WhatsApp API request failed.',
        data,
      };
    }

    return { success: true, data };
  } catch (error) {
    await logError({
      process: 'addPreverifiedWhatsAppNumberAction',
      location: 'WhatsApp Actions',
      errorMessage: toErrorMessage(error),
      context: { businessAccountId },
    });

    return { success: false, error: toErrorMessage(error) };
  }
}

export async function exchangeWhatsAppAccessTokenAction({
  code,
  redirectUri,
}: {
  code: string;
  redirectUri: string;
}): Promise<ActionResult> {
  if (!code || !redirectUri) {
    return { success: false, error: 'Authorization code and redirect URI are required.' };
  }

  const clientId = process.env.FB_APP_ID;
  const clientSecret = process.env.FB_APP_SECRET;

  if (!clientId || !clientSecret) {
    return { success: false, error: 'Missing FB app credentials in environment.' };
  }

  try {
    const response = await fetch(`${GRAPH_BASE_URL}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        error: (data as { error?: { message?: string } })?.error?.message || 'Token exchange failed.',
        data,
      };
    }

    return { success: true, data };
  } catch (error) {
    await logError({
      process: 'exchangeWhatsAppAccessTokenAction',
      location: 'WhatsApp Actions',
      errorMessage: toErrorMessage(error),
    });

    return { success: false, error: toErrorMessage(error) };
  }
}
