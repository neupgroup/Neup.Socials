/**
 * @fileoverview Core server-side API functions for managing Facebook Page
 * posts, comments, comment replies, and page-scoped user profiles.
 *
 * Provides a communication layer between the application and the
 * Facebook Graph API, including response handling, error propagation,
 * comment retrieval, comment publishing, and data normalization.
 *
 * Uses Facebook Graph API v26.0 as configured in this module.
 *
 * @module services/facebook/comment-api
 *
 * @see https://developers.facebook.com/docs/pages-api/comments
 * @see https://developers.facebook.com/docs/pages-api/posts
 */
'use server';

/** Facebook Graph API version used by this module. */
const API_VERSION = 'v26.0';

/** Base URL for versioned Facebook Graph API requests. */
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

/**
 * Represents the error response returned by the Facebook Graph API.
 */
type ErrorResponse = {
  /** API error details. */
  error: {
    /** Human-readable description of the error. */
    message: string;
  };
};

/**
 * Represents a Facebook Page feed response containing posts
 * and their expanded comments.
 */
type FacebookPostsWithCommentsResponse = {
  /** Collection of Facebook Page feed posts. */
  data: Array<{
    /** Unique identifier of the post. */
    id: string;

    /** Text content of the post, when available. */
    message?: string;

    /** Permanent URL of the Facebook post. */
    permalink_url?: string;

    /** Expanded comment collection associated with the post. */
    comments?: {
      /** Comments returned for the post. */
      data?: Array<{
        /** Unique identifier of the comment. */
        id: string;

        /** Text content of the comment. */
        message?: string;

        /** Timestamp indicating when the comment was created. */
        created_time?: string;

        /** Information about the comment author. */
        from?: {
          /** Identifier of the comment author. */
          id: string;

          /** Display name of the comment author. */
          name: string;

          /** Profile picture information of the comment author. */
          picture?: { data?: { url?: string } };
        };

        /** Media attachment associated with the comment. */
        attachment?: { media?: { image?: { src?: string } } };
      }>;
    };
  }>;
};

/**
 * Represents the detailed Graph API response for an individual
 * Facebook comment.
 */
type FacebookCommentDetailResponse = {
  /** Unique identifier of the comment. */
  id: string;

  /** Text content of the comment. */
  message?: string;

  /** Timestamp indicating when the comment was created. */
  created_time?: string;

  /** Information about the comment author. */
  from?: {
    /** Identifier of the comment author. */
    id: string;

    /** Display name of the comment author. */
    name: string;

    /** Profile picture information of the comment author. */
    picture?: { data?: { url?: string } };
  };

  /** Media attachment associated with the comment. */
  attachment?: { media?: { image?: { src?: string } } };
};

/**
 * Represents profile information retrieved using a Facebook
 * Page-Scoped User ID (PSID).
 */
export type FacebookPageScopedProfile = {
  /** Page-scoped identifier of the Facebook user. */
  id: string;

  /** First name of the Facebook user. */
  first_name?: string;

  /** Last name of the Facebook user. */
  last_name?: string;

  /** URL of the user's profile picture. */
  profile_pic?: string;
};

/**
 * Represents the response returned after successfully publishing
 * a Facebook comment or comment reply.
 */
type CommentActionResponse = {
  /** Identifier returned by the Facebook Graph API. */
  id: string;
};

/**
 * Represents a collection of Facebook post comments, optionally
 * including nested replies and pagination cursors.
 */
type FacebookCommentWithRepliesResponse = {
  /** Collection of comments returned for a Facebook post. */
  data: Array<{
    /** Unique identifier of the comment. */
    id: string;

    /** Text content of the comment. */
    message?: string;

    /** Timestamp indicating when the comment was created. */
    created_time?: string;

    /** Information about the comment author. */
    from?: {
      /** Identifier of the comment author. */
      id: string;

      /** Display name of the comment author. */
      name: string;

      /** Profile picture information of the comment author. */
      picture?: { data?: { url?: string } };
    };

    /** Media attachment associated with the comment. */
    attachment?: { media?: { image?: { src?: string } } };

    /** Expanded replies associated with the parent comment. */
    comments?: {
      /** Collection of replies returned for the comment. */
      data?: Array<{
        /** Unique identifier of the reply. */
        id: string;

        /** Text content of the reply. */
        message?: string;

        /** Timestamp indicating when the reply was created. */
        created_time?: string;

        /** Information about the reply author. */
        from?: {
          /** Identifier of the reply author. */
          id: string;

          /** Display name of the reply author. */
          name: string;

          /** Profile picture information of the reply author. */
          picture?: { data?: { url?: string } };
        };

        /** Media attachment associated with the reply. */
        attachment?: { media?: { image?: { src?: string } } };
      }>;
    };
  }>;

  /** Pagination metadata returned by the Facebook Graph API. */
  paging?: {
    /** Cursor identifiers for navigating paginated results. */
    cursors?: {
      /** Cursor for retrieving preceding results. */
      before?: string;

      /** Cursor for retrieving subsequent results. */
      after?: string;
    };
  };
};

/**
 * Represents a normalized Facebook post comment for consumption
 * by application-level comment and inbox services.
 *
 * Combines post information, comment content, author details,
 * and optional media URLs into a flattened data structure.
 */
export type FacebookPostCommentItem = {
  /** Identifier of the Facebook post containing the comment. */
  postId: string;

  /** Text content of the associated Facebook post. */
  postMessage: string;

  /** Permanent URL of the associated Facebook post. */
  permalinkUrl?: string;

  /** Unique identifier of the comment. */
  commentId: string;

  /** Text content of the comment. */
  commentText: string;

  /** Comment creation timestamp or the generated fallback timestamp. */
  createdTime: string;

  /** Identifier of the comment author. */
  commenterId: string;

  /** Display name of the comment author. */
  commenterName: string;

  /** Profile picture URL of the comment author, when available. */
  profileImage?: string | null;

  /** Attached image URL of the comment, when available. */
  commentImage?: string | null;
};

/**
 * Parses and handles a Facebook Graph API response.
 *
 * Deserializes the response body as JSON and checks the HTTP response
 * status. Unsuccessful responses are converted into errors using the
 * API-provided error message or a default fallback message.
 *
 * @typeParam T - Expected structure of the successful response payload.
 *
 * @param res - HTTP response returned by the Facebook Graph API.
 *
 * @returns A promise resolving to the parsed response cast to the
 * expected response type.
 *
 * @throws {Error} When the HTTP response indicates a failed request.
 * @throws {SyntaxError} When the response body cannot be parsed as JSON.
 *
 * @remarks
 * The response is cast to the expected TypeScript type without
 * performing runtime schema validation.
 */
async function handleApiResponse<T>(res: Response): Promise<T> {
  const json = await res.json();

  if (!res.ok) {
    const error = json as ErrorResponse;
    throw new Error(error.error?.message || 'Facebook API request failed.');
  }

  return json as T;
}

/**
 * Fetches recent posts from a Facebook Page feed and expands their comments.
 *
 * Retrieves post content, permanent URLs, comment content, author
 * information, profile pictures, and available media attachments.
 *
 * Converts nested post and comment responses into a flattened collection
 * suitable for application-level inbox and comment management features.
 *
 * Comments authored by the Page itself, as well as comments missing
 * required identifiers, text, or author information, are excluded.
 *
 * @param pageId - Unique identifier of the Facebook Page.
 * @param pageToken - Access token used to authenticate Page API requests.
 * @param options - Optional configuration for limiting retrieved results.
 * @param options.postLimit - Maximum number of feed posts requested.
 * Defaults to 10.
 * @param options.commentLimit - Maximum number of comments requested
 * per post. Defaults to 10.
 *
 * @returns A promise resolving to a flattened collection of normalized
 * Facebook post comments.
 *
 * @throws {Error} When the Facebook Graph API request fails.
 * @throws {SyntaxError} When the API response contains invalid JSON.
 * @throws {TypeError} When the underlying network request fails.
 *
 * @remarks
 * This function retrieves a single feed response and does not
 * automatically traverse pagination cursors.
 *
 * Missing post messages default to an empty string. Missing comment
 * timestamps default to the current ISO timestamp, while unavailable
 * image URLs default to null.
 */
export async function getPagePostComments(
  pageId: string,
  pageToken: string,
  options?: {
    postLimit?: number;
    commentLimit?: number;
  }
): Promise<FacebookPostCommentItem[]> {
  const postLimit = options?.postLimit ?? 10;
  const commentLimit = options?.commentLimit ?? 10;

  const params = new URLSearchParams({
    access_token: pageToken,
    limit: String(postLimit),
    fields: `id,message,permalink_url,comments.limit(${commentLimit}){id,message,created_time,attachment,from{id,name,picture}}`,
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${pageId}/feed?${params.toString()}`);
  const payload = await handleApiResponse<FacebookPostsWithCommentsResponse>(res);

  const items: FacebookPostCommentItem[] = [];

  // Flatten nested post and comment collections into individual inbox items.
  for (const post of payload.data ?? []) {
    for (const comment of post.comments?.data ?? []) {
      // Exclude comments missing required content or author information.
      if (!comment.id || !comment.message || !comment.from?.id || !comment.from?.name) {
        continue;
      }

      // Keep only user-side comments in the inbox stream.
      if (comment.from.id === pageId) {
        continue;
      }

      items.push({
        postId: post.id,
        postMessage: post.message ?? '',
        permalinkUrl: post.permalink_url,
        commentId: comment.id,
        commentText: comment.message,
        createdTime: comment.created_time ?? new Date().toISOString(),
        commenterId: comment.from.id,
        commenterName: comment.from.name,
        profileImage: comment.from.picture?.data?.url ?? null,
        commentImage: comment.attachment?.media?.image?.src ?? null,
      });
    }
  }

  return items;
}

/**
 * Fetches detailed information for an individual Facebook Page comment.
 *
 * Requests comment content, creation timestamp, media attachments,
 * and author information, including the author's profile picture.
 *
 * @param commentId - Unique identifier of the Facebook comment.
 * @param pageToken - Access token used to authenticate the request.
 *
 * @returns A promise resolving to the raw Facebook comment details.
 *
 * @throws {Error} When the Facebook Graph API request fails.
 * @throws {SyntaxError} When the API response contains invalid JSON.
 * @throws {TypeError} When the underlying network request fails.
 */
export async function getPageCommentById(
  commentId: string,
  pageToken: string
): Promise<FacebookCommentDetailResponse> {
  const params = new URLSearchParams({
    access_token: pageToken,
    fields: 'id,message,created_time,attachment,from{id,name,picture}',
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${commentId}?${params.toString()}`);
  return handleApiResponse<FacebookCommentDetailResponse>(res);
}

/**
 * Fetches comments associated with a specific Facebook post,
 * optionally expanding nested comment replies.
 *
 * Requests comment content, timestamps, author information,
 * profile pictures, and media attachments.
 *
 * When reply expansion is enabled, up to 10 nested replies are
 * requested for each returned comment.
 *
 * @param postId - Unique identifier of the Facebook post.
 * @param pageToken - Access token used to authenticate the request.
 * @param options - Optional comment retrieval configuration.
 * @param options.limit - Maximum number of top-level comments requested.
 * Defaults to 25.
 * @param options.includeReplies - Whether to include nested replies.
 * Defaults to false when omitted.
 *
 * @returns A promise resolving to the comment collection, optional
 * nested replies, and available pagination metadata.
 *
 * @throws {Error} When the Facebook Graph API request fails.
 * @throws {SyntaxError} When the API response contains invalid JSON.
 * @throws {TypeError} When the underlying network request fails.
 *
 * @remarks
 * Uses the configured Facebook Graph API v26.0 endpoint.
 * Pagination metadata is returned when available, but subsequent
 * pages are not retrieved automatically.
 *
 * @see https://developers.facebook.com/docs/pages-api/posts
 */
export async function getPostComments(
  postId: string,
  pageToken: string,
  options?: {
    limit?: number;
    includeReplies?: boolean;
  }
): Promise<FacebookCommentWithRepliesResponse> {
  const limit = options?.limit ?? 25;
  const fields = options?.includeReplies
    ? `id,message,created_time,attachment,from{id,name,picture},comments.limit(10){id,message,created_time,attachment,from{id,name,picture}}`
    : 'id,message,created_time,attachment,from{id,name,picture}';

  const params = new URLSearchParams({
    access_token: pageToken,
    fields,
    limit: String(limit),
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${postId}/comments?${params.toString()}`);
  return handleApiResponse<FacebookCommentWithRepliesResponse>(res);
}

/**
 * Publishes a comment on a Facebook Page post.
 *
 * Submits the provided message to the post's comments endpoint
 * using the supplied Page Access Token.
 *
 * @param postId - Unique identifier of the post to comment on.
 * @param pageToken - Page Access Token with the required comment
 * management permissions, such as pages_manage_engagement.
 * @param message - Text content of the comment, passed directly
 * to the Facebook Graph API.
 *
 * @returns A promise resolving to the published comment response
 * containing its identifier.
 *
 * @throws {Error} When the Facebook Graph API request fails.
 * @throws {SyntaxError} When the API response contains invalid JSON.
 * @throws {TypeError} When the underlying network request fails.
 *
 * @remarks
 * Message formatting and mention syntax are passed to the API
 * without additional processing or validation.
 *
 * @see https://developers.facebook.com/docs/pages-api/comments
 */
export async function postCommentOnPost(
  postId: string,
  pageToken: string,
  message: string
): Promise<CommentActionResponse> {
  const params = new URLSearchParams({
    access_token: pageToken,
    message,
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${postId}/comments`, {
    method: 'POST',
    body: params,
  });

  return handleApiResponse<CommentActionResponse>(res);
}

/**
 * Submits a comment reply request to the Facebook Graph API.
 *
 * Sends the provided message and Page Access Token to the
 * specified comment's Graph API node endpoint.
 *
 * @param commentId - Unique identifier of the target Facebook comment.
 * @param pageToken - Page Access Token used to authorize the request.
 * @param message - Text content of the intended reply, passed directly
 * to the Facebook Graph API.
 *
 * @returns A promise resolving to the comment action response
 * returned by Facebook.
 *
 * @throws {Error} When the Facebook Graph API request fails.
 * @throws {SyntaxError} When the API response contains invalid JSON.
 * @throws {TypeError} When the underlying network request fails.
 *
 * @remarks
 * This implementation submits the request directly to the comment
 * node rather than its comments edge.
 *
 * @see https://developers.facebook.com/docs/pages-api/comments
 */
export async function postReplyToComment(
  commentId: string,
  pageToken: string,
  message: string
): Promise<CommentActionResponse> {
  const params = new URLSearchParams({
    access_token: pageToken,
    message,
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${commentId}`, {
    method: 'POST',
    body: params,
  });

  return handleApiResponse<CommentActionResponse>(res);
}

/**
 * Fetches profile information for a Facebook user identified
 * by a Page-Scoped User ID (PSID).
 *
 * Requests the user's first name, last name, and profile picture
 * using the supplied Page Access Token.
 *
 * Profile information is subject to the availability of fields
 * and permissions granted by the Facebook Graph API.
 *
 * @param psid - Page-Scoped User ID of the target Facebook user.
 * @param pageToken - Access token belonging to the relevant Facebook Page.
 *
 * @returns A promise resolving to the page-scoped user profile.
 *
 * @throws {Error} When the Facebook Graph API request fails.
 * @throws {SyntaxError} When the API response contains invalid JSON.
 * @throws {TypeError} When the underlying network request fails.
 */
export async function getPageScopedProfile(
  psid: string,
  pageToken: string
): Promise<FacebookPageScopedProfile> {
  const params = new URLSearchParams({
    access_token: pageToken,
    fields: 'first_name,last_name,profile_pic',
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${psid}?${params.toString()}`);
  return handleApiResponse<FacebookPageScopedProfile>(res);
}
