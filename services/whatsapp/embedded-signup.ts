'use server';

import { logError } from '@/core/lib/error-logging';

type ActionResult = {
  success: boolean;
  data?: unknown;
  error?: string;
};

const GRAPH_BASE_URL = 'https://graph.facebook.com/v25.0';

function resolveWhatsAppToken(accessToken?: string) {
  return accessToken || process.env.WHATSAPP_SYSTEM_USER_TOKEN;
}

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

  const token = resolveWhatsAppToken(accessToken);
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

export async function requestPreverifiedWhatsAppNumberCodeAction({
  preverifiedId,
  codeMethod,
  language,
  accessToken,
}: {
  preverifiedId: string;
  codeMethod: 'SMS' | 'VOICE';
  language?: string;
  accessToken?: string;
}): Promise<ActionResult> {
  if (!preverifiedId || !codeMethod) {
    return { success: false, error: 'Pre-verified ID and code method are required.' };
  }

  const token = resolveWhatsAppToken(accessToken);
  if (!token) {
    return { success: false, error: 'Missing WhatsApp system user token in environment.' };
  }

  const params = new URLSearchParams({
    code_method: codeMethod,
  });

  if (language) {
    params.set('language', language);
  }

  try {
    const response = await fetch(`${GRAPH_BASE_URL}/${preverifiedId}/request_code?${params.toString()}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        error: (data as { error?: { message?: string } })?.error?.message || 'Failed to request verification code.',
        data,
      };
    }

    return { success: true, data };
  } catch (error) {
    await logError({
      process: 'requestPreverifiedWhatsAppNumberCodeAction',
      location: 'WhatsApp Actions',
      errorMessage: toErrorMessage(error),
      context: { preverifiedId },
    });

    return { success: false, error: toErrorMessage(error) };
  }
}

export async function verifyPreverifiedWhatsAppNumberCodeAction({
  preverifiedId,
  code,
  accessToken,
}: {
  preverifiedId: string;
  code: string;
  accessToken?: string;
}): Promise<ActionResult> {
  if (!preverifiedId || !code) {
    return { success: false, error: 'Pre-verified ID and verification code are required.' };
  }

  const token = resolveWhatsAppToken(accessToken);
  if (!token) {
    return { success: false, error: 'Missing WhatsApp system user token in environment.' };
  }

  const params = new URLSearchParams({ code });

  try {
    const response = await fetch(`${GRAPH_BASE_URL}/${preverifiedId}/verify_code?${params.toString()}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        error: (data as { error?: { message?: string } })?.error?.message || 'Failed to verify pre-verified number.',
        data,
      };
    }

    return { success: true, data };
  } catch (error) {
    await logError({
      process: 'verifyPreverifiedWhatsAppNumberCodeAction',
      location: 'WhatsApp Actions',
      errorMessage: toErrorMessage(error),
      context: { preverifiedId },
    });

    return { success: false, error: toErrorMessage(error) };
  }
}

export async function listPreverifiedWhatsAppNumbersAction({
  businessId,
  status,
  accessToken,
}: {
  businessId?: string;
  status?: string;
  accessToken?: string;
}): Promise<ActionResult> {
  const resolvedBusinessId = businessId || process.env.WHATSAPP_BUSINESS_ID;
  if (!resolvedBusinessId) {
    return { success: false, error: 'Missing WhatsApp business ID in environment.' };
  }

  const token = resolveWhatsAppToken(accessToken);
  if (!token) {
    return { success: false, error: 'Missing WhatsApp system user token in environment.' };
  }

  const params = new URLSearchParams();
  if (status) {
    params.set('code_verification_status', status);
  }

  try {
    const response = await fetch(`${GRAPH_BASE_URL}/${resolvedBusinessId}/preverified_numbers?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        error: (data as { error?: { message?: string } })?.error?.message || 'Failed to load pre-verified numbers.',
        data,
      };
    }

    return { success: true, data };
  } catch (error) {
    await logError({
      process: 'listPreverifiedWhatsAppNumbersAction',
      location: 'WhatsApp Actions',
      errorMessage: toErrorMessage(error),
      context: { businessId: resolvedBusinessId },
    });

    return { success: false, error: toErrorMessage(error) };
  }
}
