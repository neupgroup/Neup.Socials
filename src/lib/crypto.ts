'use server';

import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'utf8'); // Must be 32 bytes
const IV_LENGTH = 16;

if (ENCRYPTION_KEY.length !== 32) {
    throw new Error('Invalid ENCRYPTION_KEY length. Must be 32 bytes.');
}

/**
 * Encrypts a piece of text.
 * @param text The text to encrypt.
 * @returns The encrypted text in 'iv:encryptedData' format.
 */
export async function encrypt(text: string): Promise<string> {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypts a piece of text.
 * @param text The text to decrypt, in 'iv:encryptedData' format.
 * @returns The decrypted text.
 */
export async function decrypt(text: string): Promise<string> {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

/**
 * Generates a random state string for CSRF protection.
 * @param userId - The user's ID to embed in the state.
 * @returns A base64 encoded state string.
 */
export async function generateRandomState(userId: string): Promise<string> {
    const stateData = {
        userId,
        csrfToken: crypto.randomBytes(16).toString('hex'),
        // In a real app, you might store this state in a short-lived DB record
    };
    return Buffer.from(JSON.stringify(stateData)).toString('base64');
}

/**
 * Validates the state and extracts the userId.
 * @param state - The state from the OAuth callback.
 * @param storedState - If you stored the state, provide it here to compare. For this example, we decode it.
 * @returns The userId if the state is valid, otherwise throws an error.
 */
export async function validateState(state: string): Promise<{ userId: string }> {
    try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
        // In a real app, you'd look up the stored state using csrfToken and validate it.
        if (decodedState.userId && decodedState.csrfToken) {
            return { userId: decodedState.userId };
        }
        throw new Error('Invalid state content');
    } catch (e) {
        throw new Error('Invalid or tampered state parameter.');
    }
}
