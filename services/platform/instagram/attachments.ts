/**
 * Attachment types recognised by the Instagram DM pipeline.
 * Anything the normalizer can't classify falls back to `'unknown'`.
 */
export type InstagramAttachmentType = 'image' | 'video' | 'reel' | 'audio' | 'file' | 'unknown';

/**
 * Normalizes a raw Instagram Graph API message attachment into a consistent shape.
 *
 * Reads values from `attachment.payload` first, then falls back to top-level
 * attachment fields (`url`, `media_url`, `thumbnail_url`, `permalink`). A reel is
 * detected from the raw type (`reel`, `ig_reel`) or from a `/reel/` permalink.
 *
 * @param {Record<string, unknown>} attachment - Raw attachment object from the Graph API.
 * @returns {{
 *   id: string | null,
 *   type: InstagramAttachmentType,
 *   url: string | null,
 *   thumbnailUrl: string | null,
 *   permalink: string | null,
 *   metadata: Record<string, unknown>,
 *   raw: Record<string, unknown>
 * }} The normalized attachment. Missing values are `null`; `metadata` is the
 *   raw payload and `raw` is the untouched input.
 */
export function normalizeInstagramAttachment(attachment: Record<string, unknown>) {
  const rawType = String(attachment.type ?? '').toLowerCase();
  const payload = (attachment.payload && typeof attachment.payload === 'object' ? attachment.payload : {}) as Record<string, unknown>;
  const permalink = String(payload.permalink ?? attachment.permalink ?? '') || null;
  let type: InstagramAttachmentType = 'unknown';
  if (rawType === 'image' || rawType === 'photo') type = 'image';
  else if (rawType === 'reel' || rawType === 'ig_reel' || permalink?.includes('/reel/')) type = 'reel';
  else if (rawType === 'video') type = 'video';
  else if (rawType === 'audio') type = 'audio';
  else if (rawType === 'file' || rawType === 'document') type = 'file';
  return { id: String(attachment.id ?? '') || null, type, url: String(payload.url ?? attachment.url ?? attachment.media_url ?? '') || null, thumbnailUrl: String(payload.thumbnail_url ?? attachment.thumbnail_url ?? '') || null, permalink, metadata: payload, raw: attachment };
}
