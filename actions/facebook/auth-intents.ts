/**
 * @fileoverview Facebook auth intent types and constants.
 * 
 * Intents represent what functionality the user wants to enable when connecting their
 * Facebook Page. Each intent maps to specific OAuth scopes and API permissions.
 * 
 * IMPORTANT: pages_messaging requires Advanced Access Approval from Meta.
 * @see https://developers.facebook.com/docs/permissions/overview
 */

/**
 * Available Facebook integration intents.
 * - 'messages': Enable page inbox/conversation access (pages_messaging, pages_read_engagement)
 * - 'posts': Enable feed/post management (pages_manage_posts, pages_read_engagement)
 */
export const FACEBOOK_AUTH_INTENTS = ['messages', 'posts'] as const;

/**
 * Represents one of the available Facebook auth intents.
 * Used to control which OAuth scopes are requested during authentication.
 */
export type FacebookAuthIntent = (typeof FACEBOOK_AUTH_INTENTS)[number];