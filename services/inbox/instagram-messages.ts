import { prisma } from '@/lib/prisma';

type InstagramMessageEditPayload = {
  sender?: {
    id?: string;
  };
  recipient?: {
    id?: string;
  };
  timestamp?: number | string;
  message?: {
    mid?: string;
    text?: string;
  };
  message_edit?: {
    mid?: string;
    text?: string;
    num_edit?: number;
  };
  read?: {
    mid?: string;
  };
};

type InstagramMessageEditChange = {
  field?: string;
  value?: InstagramMessageEditPayload;
};

type InstagramMessageChange = {
  field?: string;
  value?: InstagramMessageEditPayload;
};

function parseEventTimestamp(value: number | string | undefined): Date {
  const timestampValue = Number(value ?? 0);

  if (Number.isFinite(timestampValue) && timestampValue > 0) {
    return new Date(timestampValue * 1000);
  }

  return new Date();
}

function getMessageChanges(payload: any): InstagramMessageChange[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  // Supports both full Meta webhook envelopes and a direct single change payload.
  if (payload.field === 'messages' && payload.value) {
    return [payload as InstagramMessageChange];
  }

  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  return entries.flatMap((entry: any) => {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    return changes.filter((change: InstagramMessageChange) => change?.field === 'messages');
  });
}

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

function getMessagingSeenChanges(payload: any): InstagramMessageChange[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  // Supports both full Meta webhook envelopes and a direct single change payload.
  if (payload.field === 'messaging_seen' && payload.value) {
    return [payload as InstagramMessageChange];
  }

  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  return entries.flatMap((entry: any) => {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    return changes.filter((change: InstagramMessageChange) => change?.field === 'messaging_seen');
  });
}

async function saveInstagramMessageEdit(payload: InstagramMessageEditPayload) {
  const senderId = String(payload?.sender?.id ?? '').trim();
  const recipientId = String(payload?.recipient?.id ?? '').trim();
  const messageMid = String(payload?.message_edit?.mid ?? '').trim();
  const messageText = String(payload?.message_edit?.text ?? '').trim();
  const numEditValue = Number(payload?.message_edit?.num_edit ?? 0);

  const eventTimestamp = parseEventTimestamp(payload?.timestamp);

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

async function saveInstagramMessage(payload: InstagramMessageEditPayload) {
  const senderId = String(payload?.sender?.id ?? '').trim();
  const recipientId = String(payload?.recipient?.id ?? '').trim();
  const messageMid = String(payload?.message?.mid ?? '').trim();
  const messageText = String(payload?.message?.text ?? '').trim();

  if (!messageMid) {
    return;
  }

  const eventTimestamp = parseEventTimestamp(payload?.timestamp);
  const payloadJson = JSON.stringify(payload);

  await prisma.$executeRaw`
    INSERT INTO instagram_messages (
      sender_id,
      recipient_id,
      event_timestamp,
      message_mid,
      message_text,
      payload,
      created_at
    )
    VALUES (
      ${senderId || null},
      ${recipientId || null},
      ${eventTimestamp},
      ${messageMid},
      ${messageText || null},
      CAST(${payloadJson} AS jsonb),
      NOW()
    )
  `;
}

async function saveInstagramMessagingSeen(payload: InstagramMessageEditPayload) {
  const senderId = String(payload?.sender?.id ?? '').trim();
  const recipientId = String(payload?.recipient?.id ?? '').trim();
  const messageMid = String(payload?.read?.mid ?? '').trim();
  const eventTimestamp = parseEventTimestamp(payload?.timestamp);
  const payloadJson = JSON.stringify(payload);

  await prisma.$executeRaw`
    INSERT INTO instagram_messages (
      sender_id,
      recipient_id,
      event_timestamp,
      message_mid,
      payload,
      created_at
    )
    VALUES (
      ${senderId || null},
      ${recipientId || null},
      ${eventTimestamp},
      ${messageMid || null},
      CAST(${payloadJson} AS jsonb),
      NOW()
    )
  `;
}

export async function processInstagramMessagesWebhook(payload: any) {
  const messageChanges = getMessageChanges(payload);
  const messageEditChanges = getMessageEditChanges(payload);
  const messagingSeenChanges = getMessagingSeenChanges(payload);

  for (const change of messageChanges) {
    if (!change?.value) {
      continue;
    }

    await saveInstagramMessage(change.value);
  }

  for (const change of messageEditChanges) {
    if (!change?.value) {
      continue;
    }

    await saveInstagramMessageEdit(change.value);
  }

  for (const change of messagingSeenChanges) {
    if (!change?.value) {
      continue;
    }

    await saveInstagramMessagingSeen(change.value);
  }
}

export async function processInstagramMessageEditsWebhook(payload: any) {
  await processInstagramMessagesWebhook(payload);
}
