'use server';

import * as mime from 'mime-types';

import { getAppBaseUrl } from '@/core/lib/app-url';

const INSTAGRAM_GRAPH_API_BASE_URL = 'https://graph.instagram.com/v25.0';

export type InstagramContainerStatusCode =
  | 'EXPIRED'
  | 'ERROR'
  | 'FINISHED'
  | 'IN_PROGRESS'
  | 'PUBLISHED';

export type InstagramVideoMediaType = 'VIDEO' | 'REELS' | 'STORIES';

export type InstagramUserTag = {
  username: string;
  x?: number;
  y?: number;
};

export type InstagramTrialParams = {
  graduation_strategy: 'MANUAL' | 'SS_PERFORMANCE';
};

export type InstagramCreateMediaContainerOptions = {
  caption?: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: 'CAROUSEL' | 'REELS' | 'STORIES' | 'VIDEO';
  isCarouselItem?: boolean;
  altText?: string;
  collaborators?: string[];
  coverUrl?: string;
  children?: string[];
  locationId?: string;
  shareToFeed?: boolean;
  thumbOffset?: number;
  trialParams?: InstagramTrialParams;
  userTags?: InstagramUserTag[];
};

export type InstagramPublishOptions = {
  collaborators?: string[];
  locationId?: string;
  shareToFeed?: boolean;
  thumbOffset?: number;
  coverUrl?: string;
  trialParams?: InstagramTrialParams;
  userTags?: InstagramUserTag[];
  altText?: string;
  videoPostType?: InstagramVideoMediaType;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
};

export type InstagramCreateMediaContainerResponse = {
  id: string;
};

export type InstagramContainerStatusResponse = {
  id?: string;
  status?: string;
  status_code?: InstagramContainerStatusCode;
};

export type InstagramPublishMediaResponse = {
  id: string;
};

type InstagramApiErrorResponse = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

const DEFAULT_POLL_INTERVAL_MS = 60_000;
const DEFAULT_MAX_POLL_ATTEMPTS = 5;

function getFullMediaUrl(url: string): string {
  if (!url) {
    return url;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  const baseUrl = getAppBaseUrl();
  return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
}

function normalizeCollaborators(collaborators?: string[]): string[] | undefined {
  const values = Array.from(new Set((collaborators ?? []).map((item) => item.trim()).filter(Boolean)));
  return values.length > 0 ? values : undefined;
}

function inferMediaKind(mediaUrl: string): 'image' | 'video' {
  const normalizedUrl = getFullMediaUrl(mediaUrl);
  const cleanUrl = normalizedUrl.split('?')[0];
  const mimeType = mime.lookup(cleanUrl) || '';

  if (mimeType.startsWith('image/')) {
    return 'image';
  }

  if (mimeType.startsWith('video/')) {
    return 'video';
  }

  throw new Error(`Unsupported Instagram media type for URL: ${mediaUrl}`);
}

async function handleInstagramApiResponse<T>(res: Response): Promise<T> {
  const raw = await res.text();
  const json = raw ? (JSON.parse(raw) as T | InstagramApiErrorResponse) : ({} as T);

  if (!res.ok) {
    const error = json as InstagramApiErrorResponse;
    throw new Error(error.error?.message || `Instagram API request failed with status ${res.status}.`);
  }

  return json as T;
}

async function instagramRequest<T>(
  path: string,
  {
    method = 'GET',
    accessToken,
    body,
  }: {
    method?: 'GET' | 'POST';
    accessToken: string;
    body?: Record<string, unknown>;
  }
): Promise<T> {
  const url = `${INSTAGRAM_GRAPH_API_BASE_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });

  return handleInstagramApiResponse<T>(res);
}

function createMediaPayload(options: InstagramCreateMediaContainerOptions): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (options.caption) {
    payload.caption = options.caption;
  }

  if (options.imageUrl) {
    payload.image_url = getFullMediaUrl(options.imageUrl);
  }

  if (options.videoUrl) {
    payload.video_url = getFullMediaUrl(options.videoUrl);
  }

  if (options.mediaType) {
    payload.media_type = options.mediaType;
  }

  if (options.isCarouselItem) {
    payload.is_carousel_item = true;
  }

  if (options.altText) {
    payload.alt_text = options.altText;
  }

  const collaborators = normalizeCollaborators(options.collaborators);
  if (collaborators) {
    payload.collaborators = collaborators;
  }

  if (options.coverUrl) {
    payload.cover_url = getFullMediaUrl(options.coverUrl);
  }

  if (options.children && options.children.length > 0) {
    payload.children = options.children.join(',');
  }

  if (options.locationId) {
    payload.location_id = options.locationId;
  }

  if (typeof options.shareToFeed === 'boolean') {
    payload.share_to_feed = options.shareToFeed;
  }

  if (typeof options.thumbOffset === 'number') {
    payload.thumb_offset = Math.max(0, Math.trunc(options.thumbOffset));
  }

  if (options.trialParams) {
    payload.trial_params = options.trialParams;
  }

  if (options.userTags && options.userTags.length > 0) {
    payload.user_tags = options.userTags;
  }

  return payload;
}

export async function createInstagramMediaContainer(
  instagramAccountId: string,
  accessToken: string,
  options: InstagramCreateMediaContainerOptions
): Promise<InstagramCreateMediaContainerResponse> {
  const payload = createMediaPayload(options);
  return instagramRequest<InstagramCreateMediaContainerResponse>(`/${instagramAccountId}/media`, {
    method: 'POST',
    accessToken,
    body: payload,
  });
}

export async function getInstagramMediaContainerStatus(
  containerId: string,
  accessToken: string
): Promise<InstagramContainerStatusResponse> {
  return instagramRequest<InstagramContainerStatusResponse>(
    `/${containerId}?fields=id,status,status_code`,
    {
      accessToken,
    }
  );
}

export async function waitForInstagramMediaContainer(
  containerId: string,
  accessToken: string,
  options?: {
    pollIntervalMs?: number;
    maxPollAttempts?: number;
  }
): Promise<InstagramContainerStatusResponse> {
  const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const maxPollAttempts = options?.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS;

  for (let attempt = 1; attempt <= maxPollAttempts; attempt += 1) {
    const status = await getInstagramMediaContainerStatus(containerId, accessToken);
    const statusCode = status.status_code;

    if (!statusCode || statusCode === 'FINISHED' || statusCode === 'PUBLISHED') {
      return status;
    }

    if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
      throw new Error(`Instagram media container ${containerId} is not publishable: ${statusCode}`);
    }

    if (attempt < maxPollAttempts) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }

  throw new Error(`Instagram media container ${containerId} did not become publishable in time.`);
}

export async function publishInstagramMediaContainer(
  instagramAccountId: string,
  accessToken: string,
  creationId: string
): Promise<InstagramPublishMediaResponse> {
  return instagramRequest<InstagramPublishMediaResponse>(`/${instagramAccountId}/media_publish`, {
    method: 'POST',
    accessToken,
    body: {
      creation_id: creationId,
    },
  });
}

async function createSingleInstagramMediaContainer(
  instagramAccountId: string,
  accessToken: string,
  caption: string,
  mediaUrl: string,
  options: InstagramPublishOptions
): Promise<string> {
  const mediaKind = inferMediaKind(mediaUrl);

  if (mediaKind === 'image') {
    const response = await createInstagramMediaContainer(instagramAccountId, accessToken, {
      imageUrl: mediaUrl,
      caption,
      altText: options.altText,
      collaborators: options.collaborators,
      locationId: options.locationId,
      userTags: options.userTags,
    });
    return response.id;
  }

  const mediaType = options.videoPostType ?? 'VIDEO';
  const response = await createInstagramMediaContainer(instagramAccountId, accessToken, {
    videoUrl: mediaUrl,
    caption,
    mediaType,
    collaborators: mediaType === 'VIDEO' ? undefined : options.collaborators,
    coverUrl: options.coverUrl,
    shareToFeed: mediaType === 'REELS' ? options.shareToFeed : undefined,
    thumbOffset: options.thumbOffset,
    trialParams: mediaType === 'REELS' ? options.trialParams : undefined,
    userTags: options.userTags,
    locationId: options.locationId,
  });

  return response.id;
}

async function createInstagramCarouselContainer(
  instagramAccountId: string,
  accessToken: string,
  caption: string,
  mediaUrls: string[],
  options: InstagramPublishOptions
): Promise<string> {
  if (mediaUrls.length > 10) {
    throw new Error('Instagram carousel posts support a maximum of 10 media items.');
  }

  const childContainerIds: string[] = [];

  for (const mediaUrl of mediaUrls) {
    const mediaKind = inferMediaKind(mediaUrl);

    const childContainer = await createInstagramMediaContainer(instagramAccountId, accessToken, {
      ...(mediaKind === 'image'
        ? {
            imageUrl: mediaUrl,
          }
        : {
            videoUrl: mediaUrl,
            mediaType: 'VIDEO',
          }),
      isCarouselItem: true,
      userTags: mediaKind === 'video' ? undefined : options.userTags,
    });

    await waitForInstagramMediaContainer(childContainer.id, accessToken, {
      pollIntervalMs: options.pollIntervalMs,
      maxPollAttempts: options.maxPollAttempts,
    });

    childContainerIds.push(childContainer.id);
  }

  const carouselContainer = await createInstagramMediaContainer(instagramAccountId, accessToken, {
    caption,
    mediaType: 'CAROUSEL',
    children: childContainerIds,
    collaborators: options.collaborators,
    locationId: options.locationId,
  });

  return carouselContainer.id;
}

export async function publishToInstagramAccount(
  instagramAccountId: string,
  accessToken: string,
  caption: string,
  mediaUrls?: string[],
  options: InstagramPublishOptions = {}
): Promise<InstagramPublishMediaResponse> {
  if (!Array.isArray(mediaUrls) || mediaUrls.length === 0) {
    throw new Error('Instagram publishing requires at least one public image or video URL.');
  }

  const creationId =
    mediaUrls.length === 1
      ? await createSingleInstagramMediaContainer(
          instagramAccountId,
          accessToken,
          caption,
          mediaUrls[0],
          options
        )
      : await createInstagramCarouselContainer(
          instagramAccountId,
          accessToken,
          caption,
          mediaUrls,
          options
        );

  await waitForInstagramMediaContainer(creationId, accessToken, {
    pollIntervalMs: options.pollIntervalMs,
    maxPollAttempts: options.maxPollAttempts,
  });

  return publishInstagramMediaContainer(instagramAccountId, accessToken, creationId);
}
