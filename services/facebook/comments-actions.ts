/**
 * @fileoverview Public export entry point for Facebook comment actions.
 *
 * Re-exports comment retrieval, publishing, and reply actions along with
 * their associated result types from the Facebook comments service.
 *
 * Provides a centralized import interface for consumers of Facebook
 * comment-related functionality.
 *
 * @module services/facebook/comments-action
 */

/**
 * Re-exports actions for fetching post comments, publishing comments,
 * and replying to existing comments.
 */
export { fetchPostCommentsAction, postCommentAction, postReplyAction } from './comments';

/**
 * Re-exports result types associated with Facebook comment operations.
 */
export type { FetchCommentsResult, PostCommentResult } from './comments';