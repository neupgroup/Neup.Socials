/**
 * @fileoverview Core server-side helpers for retrieving watchable
 * Facebook video information associated with published posts.
 *
 * Provides video identifier resolution, Graph API communication,
 * response normalization, and playback resource discovery.
 *
 * Uses Facebook Graph API v25.0.
 *
 * @module services/facebook/getVideos
 */

'use server';

/** Facebook Graph API version used for video retrieval. */
const API_VERSION = 'v25.0';

/** Base URL for versioned Facebook Graph API requests. */
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

/**
 * Represents an error response returned by the Facebook Graph API.
 */
type ErrorResponse = {
  /** Optional API error information. */
  error?: {
    /** Human-readable API error message. */
    message?: string;
  };
};

/**
 * Represents the Facebook post response used to identify
 * potential video objects associated with a post.
 */
type PostVideoLookupResponse = {
  /** Unique identifier of the Facebook post. */
  id?: string;

  /** Identifier of the object associated with the post. */
  object_id?: string;

  /** Permanent URL of the Facebook post. */
  permalink_url?: string;
};

/**
 * Represents the raw Facebook Graph API response for a video node.
 *
 * Contains optional playback resources, descriptive metadata,
 * engagement statistics, and thumbnail information.
 */
type VideoNodeResponse = {
  /** Unique identifier of the Facebook video. */
  id: string;

  /** Direct source URL of the video. */
  source?: string;

  /** Permanent URL of the Facebook video. */
  permalink_url?: string;

  /** HTML markup provided for embedding the video. */
  embed_html?: string;

  /** Title of the video. */
  title?: string;

  /** Text description of the video. */
  description?: string;

  /** Duration of the video in seconds. */
  length?: number;

  /** Video view count, when available. */
  views?: number;

  /** Alternative post-level view count. */
  post_views?: number;

  /** Timestamp indicating when the video was created. */
  created_time?: string;

  /** Information about the video publisher. */
  from?: {
    /** Identifier of the video publisher. */
    id?: string;

    /** Display name of the video publisher. */
    name?: string;
  };

  /** Thumbnail collection associated with the video. */
  thumbnails?: {
    /** Thumbnail entries returned by the API. */
    data?: Array<{
      /** URL of the video thumbnail. */
      uri?: string;
    }>;
  };
};

/**
 * Represents normalized Facebook video information for
 * application-level playback and presentation.
 *
 * Provides a consistent structure for video sources,
 * embedded playback, metadata, and engagement information.
 */
export type FacebookWatchableVideo = {
  /** Unique identifier of the Facebook video. */
  id: string;

  /** Direct video source URL, when available. */
  sourceUrl?: string;

  /** HTML markup for embedding the video. */
  embedHtml?: string;

  /** Permanent URL of the Facebook video. */
  permalinkUrl?: string;

  /** Display title of the video. */
  title?: string;

  /** Text description of the video. */
  description?: string;

  /** Duration of the video in seconds. */
  lengthSeconds?: number;

  /** Video view count or its post-level fallback. */
  views?: number;

  /** URL of the first available video thumbnail. */
  thumbnailUrl?: string;
};

/**
 * Parses and handles a Facebook Graph API response.
 *
 * Deserializes the response body and checks the HTTP response
 * status before returning the expected payload.
 *
 * @typeParam T - Expected response payload structure.
 *
 * @param res - HTTP response returned by the Facebook Graph API.
 *
 * @returns A promise resolving to the parsed response payload.
 *
 * @throws {Error} When the HTTP response indicates a failed request.
 * @throws {SyntaxError} When the response contains invalid JSON.
 *
 * @remarks
 * The parsed response is cast to the expected TypeScript type
 * without runtime schema validation.
 */
async function handleApiResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    const error = json as ErrorResponse;
    throw new Error(error.error?.message || 'Facebook API request failed');
  }
  return json as T;
}

/**
 * Retrieves potential video identifiers associated with a Facebook post.
 *
 * Requests the post's identifier, associated object identifier,
 * and permanent URL from the Facebook Graph API.
 *
 * Currently, only the object_id field is used to construct
 * the collection of candidate video identifiers.
 *
 * @param postId - Facebook Graph API identifier of the post.
 * @param pageToken - Page Access Token used to authenticate the request.
 *
 * @returns A promise resolving to a collection of unique candidate
 * video identifiers. Returns an empty array when no object identifier
 * is available.
 *
 * @throws {Error} When the Facebook Graph API request fails.
 * @throws {SyntaxError} When the response contains invalid JSON.
 * @throws {TypeError} When the underlying network request fails.
 */
async function getPostVideoCandidates(postId: string, pageToken: string): Promise<string[]> {
  const params = new URLSearchParams({
    access_token: pageToken,
    fields: 'id,object_id,permalink_url',
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${postId}?${params.toString()}`);
  const payload = await handleApiResponse<PostVideoLookupResponse>(res);

  const candidates = new Set<string>();

  // Register the associated post object as a potential video node.
  if (payload.object_id) {
    candidates.add(payload.object_id);
  }

  return Array.from(candidates);
}

/**
 * Retrieves and normalizes video information for a Facebook video node.
 *
 * Requests available playback resources, descriptive metadata,
 * video duration, view counts, and thumbnail information.
 *
 * @param videoId - Facebook Graph API identifier of the video node.
 * @param pageToken - Page Access Token used to authenticate the request.
 *
 * @returns A promise resolving to normalized Facebook video information,
 * or null when the response does not contain a video identifier.
 *
 * @throws {Error} When the Facebook Graph API request fails.
 * @throws {SyntaxError} When the response contains invalid JSON.
 * @throws {TypeError} When the underlying network request fails.
 *
 * @remarks
 * The views field takes precedence over post_views when available.
 * Only the first returned thumbnail is included in the normalized result.
 *
 * A returned video object does not necessarily contain a usable
 * playback resource.
 */
async function getVideoById(videoId: string, pageToken: string): Promise<FacebookWatchableVideo | null> {
  const params = new URLSearchParams({
    access_token: pageToken,
    fields: 'id,source,permalink_url,embed_html,title,description,length,views,post_views,thumbnails.limit(1){uri}',
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${videoId}?${params.toString()}`);
  const payload = await handleApiResponse<VideoNodeResponse>(res);

  if (!payload.id) {
    return null;
  }

  // Convert Graph API field names into the application's video structure.
  return {
    id: payload.id,
    sourceUrl: payload.source,
    embedHtml: payload.embed_html,
    permalinkUrl: payload.permalink_url,
    title: payload.title,
    description: payload.description,
    lengthSeconds: payload.length,
    views: payload.views ?? payload.post_views,
    thumbnailUrl: payload.thumbnails?.data?.[0]?.uri,
  };
}

/**
 * Resolves video information suitable for playback or navigation
 * from a Facebook post.
 *
 * Retrieves candidate video identifiers associated with the post
 * and attempts to resolve each candidate into a normalized video object.
 *
 * Returns the first video containing a direct source URL,
 * embedded HTML, or permanent URL.
 *
 * @param postId - Facebook Graph API identifier of the target post.
 * @param pageToken - Page Access Token used for API authentication.
 *
 * @returns A promise resolving to the first qualifying Facebook video,
 * or null when no qualifying video can be resolved.
 *
 * @throws Propagates errors encountered during the initial post lookup.
 *
 * @remarks
 * Errors encountered while resolving individual video candidates
 * are suppressed, allowing subsequent candidates to be processed.
 *
 * Candidate identifiers are currently resolved only through object_id.
 * Attachment-based video discovery is not implemented in this function.
 *
 * The presence of a playback resource does not guarantee that the
 * resource is accessible or playable by the end user.
 *
 * @see getPostVideoCandidates
 * @see getVideoById
 */
export async function getWatchableVideoFromPost(
  postId: string,
  pageToken: string
): Promise<FacebookWatchableVideo | null> {
  const candidates = await getPostVideoCandidates(postId, pageToken);

  for (const candidateId of candidates) {
    try {
      const video = await getVideoById(candidateId, pageToken);
      if (video?.sourceUrl || video?.embedHtml || video?.permalinkUrl) {
        return video;
      }
    } catch {
      // Keep iterating candidates when one candidate is not a video node.
    }
  }

  return null;
}
