/**
 * @fileoverview Core functions for interacting with the WhatsApp Business Cloud API.
 */
'use server';

const API_VERSION = 'v20.0';
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

type ErrorResponse = {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
};

type SendMessageResponse = {
    messaging_product: 'whatsapp';
    contacts: {
        input: string;
        wa_id: string;
    }[];
    messages: {
        id: string;
    }[];
};

type AccountNameResponse = {
    verified_name: string;
    name_status: 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED';
    id: string;
}

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
 * Sends a text message to a WhatsApp user.
 * @param accessToken The WhatsApp Business access token.
 * @param phoneNumberId The ID of the phone number sending the message.
 * @param recipientPhoneNumber The recipient's phone number.
 * @param message The text message to send.
 * @returns The response from the WhatsApp API.
 */
export async function sendTextMessage(
    accessToken: string,
    phoneNumberId: string, 
    recipientPhoneNumber: string, 
    message: string
): Promise<SendMessageResponse> {

    if (!phoneNumberId || !accessToken) {
        throw new Error('WhatsApp access token or phone number ID are missing.');
    }
    
    const endpoint = `${GRAPH_API_BASE_URL}/${phoneNumberId}/messages`;
    
    const body = {
        messaging_product: 'whatsapp',
        to: recipientPhoneNumber,
        type: 'text',
        text: {
            body: message,
        },
    };

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    return handleApiResponse<SendMessageResponse>(res);
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
