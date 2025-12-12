
/**
 * @fileoverview Core functions for interacting with the LinkedIn API.
 */
'use server';

const API_BASE_URL = 'https://api.linkedin.com/v2';
const OAUTH_URL = 'https://www.linkedin.com/oauth/v2/accessToken';

type AccessTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope: string;
};

type ErrorResponse = {
  error: string;
  error_description: string;
};

type LinkedInProfile = {
    id: string;
    localizedFirstName: string;
    localizedLastName: string;
    profilePicture: {
        'displayImage~': {
            elements: Array<{
                identifiers: Array<{
                    identifier: string;
                }>
            }>
        }
    }
}

async function handleApiResponse<T>(res: Response): Promise<T> {
    const json = await res.json();
    if (!res.ok) {
        const error = json as ErrorResponse;
        console.error('LinkedIn API Error:', error);
        throw new Error(error.error_description || 'An unknown LinkedIn API error occurred.');
    }
    return json as T;
}

/**
 * Exchanges an authorization code for an access token.
 */
export async function exchangeCodeForToken(code: string): Promise<AccessTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
  });

  const res = await fetch(OAUTH_URL, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
  });

  return handleApiResponse<AccessTokenResponse>(res);
}

/**
 * Fetches the user's basic profile information.
 */
export async function getUserProfile(accessToken: string): Promise<LinkedInProfile> {
    const res = await fetch(`${API_BASE_URL}/me`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0', // Required by LinkedIn API
        }
    });
    return handleApiResponse<LinkedInProfile>(res);
}
