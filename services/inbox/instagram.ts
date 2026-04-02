import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/error-logging';
import { processInstagramLiveCommentsWebhook } from '@/services/inbox/instagram-live-comments';
import { processInstagramMessageEditsWebhook } from '@/services/inbox/instagram-messages';

type InstagramCommentPayload = {
  from?: {
    id?: string;
    username?: string;
  };
  media?: {
    id?: string;
    media_product_type?: string;
  };
  id?: string;
  parent_id?: string;
  text?: string;
};

type InstagramCommentChange = {
  field?: string;
  value?: InstagramCommentPayload;
};

function getCommentChanges(payload: any): InstagramCommentChange[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  // Supports both full Meta webhook envelopes and a direct single change payload.
  if (payload.field === 'comments' && payload.value) {
    return [payload as InstagramCommentChange];
  }

  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  return entries.flatMap((entry: any) => {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    return changes.filter((change: InstagramCommentChange) => change?.field === 'comments');
  });
}

async function saveInstagramComment(payload: InstagramCommentPayload) {
  const commentId = String(payload?.id ?? '').trim();
  const parentId = String(payload?.parent_id ?? '').trim();
  const mediaId = String(payload?.media?.id ?? '').trim();
  const mediaProductType = String(payload?.media?.media_product_type ?? '').trim();
  const fromId = String(payload?.from?.id ?? '').trim();
  const fromUsername = String(payload?.from?.username ?? '').trim();
  const commentText = String(payload?.text ?? '').trim();

  if (!commentId) {
    return;
  }

  const payloadJson = JSON.stringify(payload);

  await prisma.$executeRaw`
    INSERT INTO instagram_comments (
      comment_id,
      parent_id,
      media_id,
      media_product_type,
      from_id,
      from_username,
      text,
      payload,
      created_at,
      updated_at
    )
    VALUES (
      ${commentId},
      ${parentId || null},
      ${mediaId || null},
      ${mediaProductType || null},
      ${fromId || null},
      ${fromUsername || null},
      ${commentText || null},
      CAST(${payloadJson} AS jsonb),
      NOW(),
      NOW()
    )
    ON CONFLICT (comment_id)
    DO UPDATE SET
      parent_id = EXCLUDED.parent_id,
      media_id = EXCLUDED.media_id,
      media_product_type = EXCLUDED.media_product_type,
      from_id = EXCLUDED.from_id,
      from_username = EXCLUDED.from_username,
      text = EXCLUDED.text,
      payload = EXCLUDED.payload,
      updated_at = NOW()
  `;
}

export async function processInstagramWebhook(payload: any) {
  try {
    const commentChanges = getCommentChanges(payload);

    for (const change of commentChanges) {
      if (!change?.value) {
        continue;
      }

      await saveInstagramComment(change.value);
    }

    await processInstagramLiveCommentsWebhook(payload);
    await processInstagramMessageEditsWebhook(payload);
  } catch (error: any) {
    await logError({
      process: 'processInstagramWebhook',
      location: 'Instagram Webhook Service',
      errorMessage: error?.message || 'Failed to process Instagram webhook payload.',
      context: {
        error: String(error),
      },
    });

    throw error;
  }
}
