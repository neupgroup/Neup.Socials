'use server';

import { dataStore } from '@/core/lib/data-store';

export async function handleWhatsAppAccountAlerts(value: any) {
  console.log('🔔 [Service] Processing Account Alert:', value);
  await dataStore.systemAlerts.create({
    type: 'account_alert',
    platform: 'WhatsApp',
    payload: value,
    timestamp: new Date(),
  });
}

export async function handleWhatsAppAccountReviewUpdate(value: any) {
  console.log('⚖️ [Service] Processing Account Review Update:', value);
  await dataStore.systemAlerts.create({
    type: 'review_update',
    platform: 'WhatsApp',
    payload: value,
    timestamp: new Date(),
  });
}

export async function handleWhatsAppAccountSettingsUpdate(value: any) {
  console.log('⚙️ [Service] Processing Account Settings Update:', value);
  await dataStore.systemAlerts.create({
    type: 'settings_update',
    platform: 'WhatsApp',
    payload: value,
    timestamp: new Date(),
  });
}
