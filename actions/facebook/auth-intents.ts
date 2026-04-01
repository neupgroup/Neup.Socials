export const FACEBOOK_AUTH_INTENTS = ['messages', 'posts'] as const;

export type FacebookAuthIntent = (typeof FACEBOOK_AUTH_INTENTS)[number];