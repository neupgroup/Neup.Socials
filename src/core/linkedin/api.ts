

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
  message?: string; // Adding this to catch more error details
};

type LinkedInProfile = {
    sub: string; // OIDC uses 'sub' for user ID
    name: string;
    given_name: string;
    family_name: string;
    picture?: string;
    email?: string;
    email_verified?: boolean;
}

async function handleApiResponse<T>(res: Response): Promise<T> {
    const json = await res.json();
    if (!res.ok) {
        const error = json as ErrorResponse;
        console.error('LinkedIn API Error:', error);
        // Use the more specific 'message' field if available
        throw new Error(error.message || error.error_description || 'An unknown LinkedIn API error occurred.');
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
 * Fetches the user's basic profile information using the OIDC userinfo endpoint.
 */
export async function getUserProfile(accessToken: string): Promise<LinkedInProfile> {
    const res = await fetch(`${API_BASE_URL}/userinfo`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        }
    });
    return handleApiResponse<LinkedInProfile>(res);
}
