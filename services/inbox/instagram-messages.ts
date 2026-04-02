import { prisma } from '@/lib/prisma';

type InstagramMessageEditPayload = {
  sender?: {
    id?: string;
  };
  recipient?: {
    id?: string;
  };
  timestamp?: number;
  message_edit?: {
    mid?: string;
    text?: string;
    num_edit?: number;
  };
};

type InstagramMessageEditChange = {
  field?: string;
  value?: InstagramMessageEditPayload;
};

function getMessageEditChanges(payload: any): InstagramMessageEditChange[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  // Supports both full Meta webhook envelopes and a direct single change payload.
  if (payload.field === 'message_edit' && payload.value) {
    return [payload as InstagramMessageEditChange];
  }

  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  return entries.flatMap((entry: any) => {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    return changes.filter((change: InstagramMessageEditChange) => change?.field === 'message_edit');
  });
}

async function saveInstagramMessageEdit(payload: InstagramMessageEditPayload) {
  const senderId = String(payload?.sender?.id ?? '').trim();
  const recipientId = String(payload?.recipient?.id ?? '').trim();
  const timestampValue = Number(payload?.timestamp ?? 0);
  const messageMid = String(payload?.message_edit?.mid ?? '').trim();
  const messageText = String(payload?.message_edit?.text ?? '').trim();
  const numEditValue = Number(payload?.message_edit?.num_edit ?? 0);

  const eventTimestamp = Number.isFinite(timestampValue) && timestampValue > 0
    ? new Date(timestampValue * 1000)
    : new Date();

  const numEdit = Number.isFinite(numEditValue) && numEditValue > 0 ? numEditValue : null;
  const payloadJson = JSON.stringify(payload);

  // Intentionally always INSERT: each edit is stored as a new row/event.
  await prisma.$executeRaw`
    INSERT INTO instagram_messages (
      sender_id,
      recipient_id,
      event_timestamp,
      message_mid,
      message_text,
      num_edit,
      payload,
      created_at
    )
    VALUES (
      ${senderId || null},
      ${recipientId || null},
      ${eventTimestamp},
      ${messageMid || null},
      ${messageText || null},
      ${numEdit},
      CAST(${payloadJson} AS jsonb),
      NOW()
    )
  `;
}

export async function processInstagramMessageEditsWebhook(payload: any) {
  const messageEditChanges = getMessageEditChanges(payload);

  for (const change of messageEditChanges) {
    if (!change?.value) {
      continue;
    }

    await saveInstagramMessageEdit(change.value);
  }
}
