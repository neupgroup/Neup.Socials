'use server';

export async function getWhatsAppEmbeddedSignupUrl() {
  return process.env.SOCIALS_WHATSAPP_EMBEDED_SIGNUP_URL ?? null;
}
