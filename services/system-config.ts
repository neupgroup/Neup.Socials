'use server';

/**
 * Gets a system config entry.
 *
 * Currently only `whatsapp_embedded_signup_link` is supported, and its value
 * comes from the `WHATSAPP_EMBEDDED_SIGNUP_LINK` environment variable.
 *
 * @param key - Config key.
 * @returns `{ key, value }` for the supported key (`value` is `null` if the
 * env var is unset), or `null` for any other key.
 */
export const getSystemConfig = async (key: string) =>
  key === 'whatsapp_embedded_signup_link'
    ? { key, value: process.env.WHATSAPP_EMBEDDED_SIGNUP_LINK ?? null }
    : null;

/**
 * Stub for saving a system config entry. Nothing is persisted; the input is
 * returned unchanged.
 *
 * @param data - The config entry.
 * @param data.key - Config key.
 * @param data.value - Config value.
 * @returns The same `data` object.
 */
export const upsertSystemConfig = async (data: { key: string; value?: string | null }) => data;

/**
 * Stub for recording a system alert. The alert is only logged to the console
 * and not persisted.
 *
 * @param data - Alert payload.
 * @returns The same `data` value.
 */
export const createSystemAlert = async (data: unknown) => {
  console.info('[system alert]', data);
  return data;
};

/**
 * Gets the WhatsApp embedded signup link.
 *
 * @returns The link, or an empty string if it is not configured.
 */
export const getWhatsAppEmbeddedSignupLink = async () =>
  (await getSystemConfig('whatsapp_embedded_signup_link'))?.value ?? '';
