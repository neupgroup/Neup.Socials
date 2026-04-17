import { prisma } from '@/core/lib/prisma';

type InstagramLiveCommentPayload = {
  from?: {
    id?: string;
    username?: string;
    self_ig_scoped_id?: string;
  };
  media?: {
    id?: string;
    media_product_type?: string;
  };
  id?: string;
  text?: string;
};

type InstagramLiveCommentChange = {
  field?: string;
  value?: InstagramLiveCommentPayload;
};

function getLiveCommentChanges(payload: any): InstagramLiveCommentChange[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  // Supports both full Meta webhook envelopes and a direct single change payload.
  if (payload.field === 'live_comments' && payload.value) {
    return [payload as InstagramLiveCommentChange];
  }

  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  return entries.flatMap((entry: any) => {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    return changes.filter((change: InstagramLiveCommentChange) => change?.field === 'live_comments');
  });
}

async function saveInstagramLiveComment(payload: InstagramLiveCommentPayload) {
  const commentId = String(payload?.id ?? '').trim();
  const mediaId = String(payload?.media?.id ?? '').trim();
  const mediaProductType = String(payload?.media?.media_product_type ?? '').trim();
  const fromId = String(payload?.from?.id ?? '').trim();
  const fromUsername = String(payload?.from?.username ?? '').trim();
  const selfIgScopedId = String(payload?.from?.self_ig_scoped_id ?? '').trim();
  const commentText = String(payload?.text ?? '').trim();

  if (!commentId) {
    return;
  }

  const payloadJson = JSON.stringify(payload);

  await prisma.$executeRaw`
    INSERT INTO instagram_live_comments (
      comment_id,
      media_id,
      media_product_type,
      from_id,
      from_username,
      self_ig_scoped_id,
      text,
      payload,
      created_at,
      updated_at
    )
    VALUES (
      ${commentId},
      ${mediaId || null},
      ${mediaProductType || null},
      ${fromId || null},
      ${fromUsername || null},
      ${selfIgScopedId || null},
      ${commentText || null},
      CAST(${payloadJson} AS jsonb),
      NOW(),
      NOW()
    )
    ON CONFLICT (comment_id)
    DO UPDATE SET
      media_id = EXCLUDED.media_id,
      media_product_type = EXCLUDED.media_product_type,
      from_id = EXCLUDED.from_id,
      from_username = EXCLUDED.from_username,
      self_ig_scoped_id = EXCLUDED.self_ig_scoped_id,
      text = EXCLUDED.text,
      payload = EXCLUDED.payload,
      updated_at = NOW()
  `;
}

export async function processInstagramLiveCommentsWebhook(payload: any) {
  const liveCommentChanges = getLiveCommentChanges(payload);

  for (const change of liveCommentChanges) {
    if (!change?.value) {
      continue;
    }

    await saveInstagramLiveComment(change.value);
  }
}
