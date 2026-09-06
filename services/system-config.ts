'use server';

export const getSystemConfig = async (key: string) =>
  key === 'whatsapp_embedded_signup_link'
    ? { key, value: process.env.WHATSAPP_EMBEDDED_SIGNUP_LINK ?? null }
    : null;
export const upsertSystemConfig = async (data: { key: string; value?: string | null }) => data;
export const createSystemAlert = async (data: unknown) => {
  console.info('[system alert]', data);
  return data;
};
export const getWhatsAppEmbeddedSignupLink = async () =>
  (await getSystemConfig('whatsapp_embedded_signup_link'))?.value ?? '';
