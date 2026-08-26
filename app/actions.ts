// This file is deprecated. Server actions live under /services now.
'use server';

import { ensureRecord } from '@/logica/account/self';

export async function ensureCurrentAccountAction() {
  const account = await ensureRecord();
  if (!account) return null;

  return {
    displayName: account.displayName,
    displayImage: account.displayImage,
    neupId: account.neupId,
  };
}
