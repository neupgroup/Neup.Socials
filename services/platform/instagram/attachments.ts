export type InstagramAttachmentType = 'image' | 'video' | 'reel' | 'audio' | 'file' | 'unknown';

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
