import { prisma } from '@/lib/prisma';

type InstagramReactionPayload = {
  sender?: {
    id?: string;
  };
  recipient?: {
    id?: string;
  };
  timestamp?: number;
  reaction?: {
    mid?: string;
    action?: string;
    reaction?: string;
    emoji?: string;
  };
};

type InstagramReactionChange = {
  field?: string;
  value?: InstagramReactionPayload;
};

type ReactionSummary = Record<string, number>;

function getMessageReactionChanges(payload: any): InstagramReactionChange[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  // Supports both full Meta webhook envelopes and a direct single change payload.
  if (payload.field === 'message_reactions' && payload.value) {
    return [payload as InstagramReactionChange];
  }

  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  return entries.flatMap((entry: any) => {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    return changes.filter((change: InstagramReactionChange) => change?.field === 'message_reactions');
  });
}

function normalizeReactionKey(payload: InstagramReactionPayload): string {
  const namedReaction = String(payload?.reaction?.reaction ?? '').trim().toLowerCase();
  if (namedReaction) {
    return namedReaction;
  }

  const emoji = String(payload?.reaction?.emoji ?? '').trim();
  if (emoji) {
    return emoji;
  }

  return 'unknown';
}

function toReactionSummary(value: unknown): ReactionSummary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const summary: ReactionSummary = {};

  for (const [key, count] of Object.entries(value as Record<string, unknown>)) {
    const numericCount = Number(count);
    if (Number.isFinite(numericCount) && numericCount > 0) {
      summary[key] = Math.floor(numericCount);
    }
  }

  return summary;
}

async function applyReactionAggregate(payload: InstagramReactionPayload) {
  const messageMid = String(payload?.reaction?.mid ?? '').trim();
  if (!messageMid) {
    return;
  }

  const action = String(payload?.reaction?.action ?? '').trim().toLowerCase();
  const reactionKey = normalizeReactionKey(payload);

  const existingRows = await prisma.$queryRaw<Array<{ id: string; reaction_summary: unknown }>>`
    SELECT id, reaction_summary
    FROM instagram_messages
    WHERE message_mid = ${messageMid}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const existingMessage = existingRows[0];
  const summary = toReactionSummary(existingMessage?.reaction_summary);
  const current = summary[reactionKey] ?? 0;

  if (action === 'unreact') {
    const next = Math.max(0, current - 1);
    if (next === 0) {
      delete summary[reactionKey];
    } else {
      summary[reactionKey] = next;
    }
  } else {
    summary[reactionKey] = current + 1;
  }

  if (existingMessage?.id) {
    const summaryJson = JSON.stringify(summary);

    await prisma.$executeRaw`
      UPDATE instagram_messages
      SET reaction_summary = CAST(${summaryJson} AS jsonb)
      WHERE id = ${existingMessage.id}
    `;

    return;
  }

  const summaryJson = JSON.stringify(summary);

  await prisma.$executeRaw`
    INSERT INTO instagram_messages (
      event_timestamp,
      message_mid,
      reaction_summary,
      created_at
    )
    VALUES (
      NOW(),
      ${messageMid},
      CAST(${summaryJson} AS jsonb),
      NOW()
    )
  `;
}

export async function processInstagramMessageReactionsWebhook(payload: any) {
  const reactionChanges = getMessageReactionChanges(payload);

  for (const change of reactionChanges) {
    if (!change?.value) {
      continue;
    }

    await applyReactionAggregate(change.value);
  }
}
