
/**
 * @fileoverview Core functions for interacting with the LinkedIn API.
 */
'use server';

import { logError } from '@/lib/error-logging';

const API_BASE_URL = 'https://api.linkedin.com/v2';
const REST_API_BASE_URL = 'https://api.linkedin.com/rest';
const OAUTH_URL = 'https://www.linkedin.com/oauth/v2/accessToken';

type AccessTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope: string;
};

type ErrorResponse = {
  error?: string;
  error_description?: string;
  message?: string; // Adding this to catch more error details
  serviceErrorCode?: number;
  code?: string;
  status?: number;
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

type PostResponse = {
    id: string;
}

type FeedPost = {
  id: string; // e.g., "urn:li:share:..."
  author: string;
  commentary: string;
  createdAt: number;
  publishedAt: number;
};

type FeedResponse = {
  elements: FeedPost[];
  paging: object;
};

async function handleApiResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const json = await res.json().catch(() => ({})); // Catch JSON parsing errors
        const error = json as ErrorResponse;
        console.error('LinkedIn API Error:', error);
        // Use a more detailed error message if available
        const message = error.message || error.error_description || 'An unknown LinkedIn API error occurred.';
        throw new Error(message);
    }
    // For 201 Created from Posts API, the ID is in headers, body is empty
    if (res.status === 201) {
        const id = res.headers.get('x-restli-id');
        return { id: id } as T;
    }
    return res.json() as T;
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


/**
 * Publishes content to a LinkedIn member's feed using the UGC Posts API.
 * @param accessToken The access token for the user.
 * @param authorUrn The URN of the author (e.g., 'urn:li:person:xxxx').
 * @param content The text content of the post.
 * @returns An object containing the ID of the created post.
 */
export async function publishToLinkedIn(
  accessToken: string,
  authorUrn: string,
  content: string
): Promise<PostResponse> {
  const postData = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: content,
        },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const res = await fetch(`${API_BASE_URL}/ugcPosts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postData),
  });

  return handleApiResponse<PostResponse>(res);
}


/**
 * Fetches posts for a given LinkedIn user.
 * @param accessToken The access token for the user.
 * @param authorUrn The URN of the author.
 * @returns A list of posts.
 */
export async function getLinkedInPosts(accessToken: string, authorUrn: string): Promise<FeedResponse> {
    const params = new URLSearchParams({
        q: 'author',
        author: authorUrn,
        count: '25', // Fetch up to 25 posts
        sortBy: 'CREATED'
    });

    const res = await fetch(`${REST_API_BASE_URL}/posts?${params.toString()}`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Linkedin-Version': '202402',
        }
    });

    return handleApiResponse<FeedResponse>(res);
}
