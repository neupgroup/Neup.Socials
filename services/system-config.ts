'use server';

import { revalidatePath } from 'next/cache';

import { dataStore } from '@/core/lib/data-store';

const WHATSAPP_EMBEDDED_SIGNUP_LINK_KEY = 'whatsapp_embedded_signup_link';

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('WhatsApp embedded signup link is required.');
  }

  try {
    return new URL(trimmed).toString();
  } catch (error) {
    throw new Error('WhatsApp embedded signup link must be a valid URL.');
  }
};

export async function getWhatsAppEmbeddedSignupLink() {
  const record = await dataStore.systemConfig.getByKey(WHATSAPP_EMBEDDED_SIGNUP_LINK_KEY);
  return record?.value ?? null;
}

export async function updateWhatsAppEmbeddedSignupLinkAction(formData: FormData) {
  const value = normalizeUrl(String(formData.get('embeddedSignupLink') ?? ''));

  await dataStore.systemConfig.upsert({
    key: WHATSAPP_EMBEDDED_SIGNUP_LINK_KEY,
    value,
  });

  revalidatePath('/settings/whatsapp');
}
