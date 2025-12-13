
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

type RegisterUploadResponse = {
    value: {
        uploadMechanism: {
            "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": {
                uploadUrl: string;
            }
        },
        asset: string;
    }
}

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
    return res.json().catch(() => ({} as T)); // Handle empty JSON body on success
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

const getFullMediaUrl = (url: string) => {
    return url && !url.startsWith('http') ? `https://neupgroup.com${url}` : url;
};

/**
 * Step 1: Register an image for upload with LinkedIn.
 * @returns The upload URL and the asset URN.
 */
async function registerLinkedInImageUpload(accessToken: string, authorUrn: string): Promise<{ uploadUrl: string, assetUrn: string }> {
    const registerUploadRequest = {
        registerUploadRequest: {
            recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
            owner: authorUrn,
            serviceRelationships: [
                {
                    relationshipType: "OWNER",
                    identifier: "urn:li:userGeneratedContent"
                }
            ]
        }
    };
    
    const res = await fetch(`${API_BASE_URL}/assets?action=registerUpload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(registerUploadRequest)
    });
    
    const responseData = await handleApiResponse<RegisterUploadResponse>(res);
    
    return {
        uploadUrl: responseData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl,
        assetUrn: responseData.value.asset
    };
}


/**
 * Step 2: Upload the image binary to the provided URL.
 */
async function uploadImageToLinkedIn(uploadUrl: string, mediaUrl: string, accessToken: string) {
    const imageUrl = getFullMediaUrl(mediaUrl);
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    
    const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/octet-stream',
        },
        body: imageBuffer
    });

    if (!res.ok) {
        throw new Error(`LinkedIn image binary upload failed with status: ${res.status}`);
    }
}


/**
 * Publishes content to a LinkedIn member's feed using the UGC Posts API.
 * @param accessToken The access token for the user.
 * @param authorUrn The URN of the author (e.g., 'urn:li:person:xxxx').
 * @param content The text content of the post.
 * @param mediaUrls Optional array of media URLs. Currently supports one image.
 * @returns An object containing the ID of the created post.
 */
export async function publishToLinkedIn(
  accessToken: string,
  authorUrn: string,
  content: string,
  mediaUrls?: string[]
): Promise<PostResponse> {
    const postData: any = {
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

    if (mediaUrls && mediaUrls.length > 0) {
        // LinkedIn's UGC Posts API for members supports one image or one video.
        // We'll implement for one image for now.
        const mediaUrl = mediaUrls[0];
        
        try {
            // Step 1 & 2: Register and upload the image
            const { uploadUrl, assetUrn } = await registerLinkedInImageUpload(accessToken, authorUrn);
            await uploadImageToLinkedIn(uploadUrl, mediaUrl, accessToken);
            
            // Step 3: Include the asset in the post
            postData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
            postData.specificContent['com.linkedin.ugc.ShareContent'].media = [
                {
                    status: 'READY',
                    media: assetUrn,
                }
            ];

        } catch (error: any) {
            console.error("LinkedIn image upload failed:", error);
            // Fallback to a text-only post if image upload fails
            await logError({
                source: 'publishToLinkedIn',
                message: 'Image upload failed, falling back to text-only post.',
                context: { originalError: error.message, authorUrn },
            });
             postData.specificContent['com.linkedin.ugc.ShareContent'].shareCommentary.text = `${content}\n\n(Image intended: ${getFullMediaUrl(mediaUrl)})`;
        }
    }

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

    