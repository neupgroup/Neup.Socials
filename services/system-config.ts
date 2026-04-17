'use server';

export async function getWhatsAppEmbeddedSignupLink() {
  return process.env.WHATSAPP_EMBEDED_SIGNUP_URL ?? null;
}
