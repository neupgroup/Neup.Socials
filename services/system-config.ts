'use server';

import { dataStore } from '@/services/repositories';

export const getSystemConfig = dataStore.systemConfig.getByKey;
export const upsertSystemConfig = dataStore.systemConfig.upsert;
export const createSystemAlert = dataStore.systemAlerts.create;
export const getWhatsAppEmbeddedSignupLink = async () =>
  (await getSystemConfig('whatsapp_embedded_signup_link'))?.value ?? '';
