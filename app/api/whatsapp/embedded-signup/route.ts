import { NextResponse } from 'next/server';

import {
  getWhatsAppEmbeddedSignupConfigId,
  getWhatsAppEmbeddedSignupUrl,
} from '@/services/whatsapp/embedded-signup-config';

export async function GET() {
  const url = await getWhatsAppEmbeddedSignupUrl();
  const configId = await getWhatsAppEmbeddedSignupConfigId();
  return NextResponse.json({ url, configId });
}
