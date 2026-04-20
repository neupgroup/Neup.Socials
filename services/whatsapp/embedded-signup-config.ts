'use server';

export async function getWhatsAppEmbeddedSignupUrl() {
  return process.env.WHATSAPP_EMBEDED_SIGNUP_URL ?? null;
}
