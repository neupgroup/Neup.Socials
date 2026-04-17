'use server';

type ErrorResponse = {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
};

type AccountNameResponse = {
  verified_name: string;
  name_status: 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED';
  id: string;
};

const API_VERSION = 'v20.0';
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

async function handleApiResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    const error = json as ErrorResponse;
    console.error('WhatsApp API Error:', error);
    throw new Error(error.error?.message || 'An unknown WhatsApp API error occurred.');
  }
  return json as T;
}

/**
 * Fetches the display name and status for a given WhatsApp Business Phone Number ID.
 * @param phoneNumberId The ID of the phone number.
 * @param accessToken The access token associated with the WhatsApp Business Account.
 * @returns An object with the verified_name and name_status.
 */
export async function getWhatsAppAccountName(
  phoneNumberId: string,
  accessToken: string
): Promise<AccountNameResponse> {
  const params = new URLSearchParams({
    fields: 'verified_name,name_status',
    access_token: accessToken,
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${phoneNumberId}?${params.toString()}`);
  return handleApiResponse<AccountNameResponse>(res);
}
