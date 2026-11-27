/**
 * @fileoverview Core server-side functions for retrieving Facebook Page
 * conversations and sending Messenger text messages.
 *
 * Provides Graph API communication, response parsing, conversation
 * message normalization, incoming message filtering, and outbound
 * text message submission.
 *
 * Uses Facebook Graph API v25.0 as configured in this module.
 *
 * @module services/facebook/messages
 */
'use server';

/** Facebook Graph API version used for conversation and messaging requests. */
const API_VERSION = 'v25.0';

/** Base URL for versioned Facebook Graph API requests. */
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

/**
 * Represents an error response returned by the Facebook Graph API.
 */
type ErrorResponse = {
  /** API error information. */
  error: {
    /** Human-readable API error message. */
    message: string;
  };
};

/**
 * Represents the raw Facebook Graph API response containing
 * Page conversations, expanded participants, and recent messages.
 */
type FacebookConversationResponse = {
  /** Collection of conversations associated with the Facebook Page. */
  data: Array<{
    /** External identifier of the Facebook conversation. */
    id: string;

    /** Timestamp indicating when the conversation was last updated. */
    updated_time?: string;

    /** Expanded participant information for the conversation. */
    participants?: {
      /** Collection of conversation participants. */
      data?: Array<{
        /** Identifier of the conversation participant. */
        id: string;

        /** Display name of the conversation participant. */
        name: string;
      }>;
    };

    /** Expanded messages associated with the conversation. */
    messages?: {
      /** Collection of messages returned for the conversation. */
      data?: Array<{
        /** External identifier of the Facebook message. */
        id: string;

        /** Text content of the message. */
        message?: string;

        /** Timestamp indicating when the message was created. */
        created_time?: string;

        /** Information about the message sender. */
        from?: {
          /** External identifier of the message sender. */
          id: string;

          /** Display name of the message sender. */
          name: string;
        };
      }>;
    };
  }>;
};

/**
 * Represents the Graph API response for an outbound Messenger message.
 */
type SendPageMessageResponse = {
  /** Identifier of the message recipient. */
  recipient_id?: string;

  /** Identifier assigned to the sent message. */
  message_id?: string;
};

/**
 * Represents a normalized incoming message associated with
 * a Facebook Page conversation.
 *
 * Combines conversation identifiers, message content, sender
 * information, and creation timestamps into a flattened structure.
 */
export type FacebookPageMessageItem = {
  /** External identifier of the associated Facebook conversation. */
  conversationId: string;

  /** External identifier of the Facebook message. */
  messageId: string;

  /** Text content of the received message. */
  text: string;

  /** Message creation timestamp or its generated fallback. */
  createdTime: string;

  /** External identifier of the message sender. */
  senderId: string;

  /** Display name of the message sender. */
  senderName: string;
};

/**
 * Parses and handles a Facebook Graph API response.
 *
 * Deserializes the response body as JSON and checks the HTTP status.
 * Unsuccessful responses are converted into errors using the
 * API-provided message or a default fallback message.
 *
 * @typeParam T - Expected structure of the successful response payload.
 * @param res - HTTP response returned by the Facebook Graph API.
 *
 * @returns A promise resolving to the parsed response payload.
 *
 * @throws {Error} When the HTTP response indicates a failed request.
 * @throws {SyntaxError} When the response body contains invalid JSON.
 *
 * @remarks
 * The parsed response is cast to the expected TypeScript type
 * without runtime schema validation.
 */
async function handleApiResponse<T>(res: Response): Promise<T> {
  const json = await res.json();

  if (!res.ok) {
    const error = json as ErrorResponse;
    throw new Error(error.error?.message || 'Facebook API request failed.');
  }

  return json as T;
}

/**
 * Retrieves Facebook Page conversations with expanded recent messages
 * and participant information.
 *
 * Flattens the nested conversation and message collections into
 * individual incoming message items suitable for inbox processing.
 *
 * Messages authored by the Page itself, as well as messages
 * missing required text or sender information, are excluded.
 *
 * @param pageId - External identifier of the Facebook Page.
 * @param pageToken - Page Access Token used for API authentication.
 * @param options - Optional conversation and message retrieval configuration.
 * @param options.conversationLimit - Maximum number of conversations
 * requested. Defaults to 15.
 * @param options.messageLimit - Maximum number of messages requested
 * per conversation. Defaults to 10.
 *
 * @returns A promise resolving to a flattened collection of incoming
 * Facebook Page messages.
 *
 * @throws {Error} When the Facebook Graph API request fails.
 * @throws {SyntaxError} When the response contains invalid JSON.
 * @throws {TypeError} When the underlying network request fails.
 *
 * @remarks
 * Up to 10 participants are requested per conversation, although
 * participant records are not included in the normalized output.
 *
 * Missing message creation timestamps fall back to the conversation's
 * updated timestamp, followed by the current ISO timestamp.
 *
 * This function does not automatically traverse pagination cursors
 * or explicitly sort the flattened message collection.
 */
export async function getPageConversationsWithMessages(
  pageId: string,
  pageToken: string,
  options?: {
    conversationLimit?: number;
    messageLimit?: number;
  }
): Promise<FacebookPageMessageItem[]> {
  const conversationLimit = options?.conversationLimit ?? 15;
  const messageLimit = options?.messageLimit ?? 10;

  const params = new URLSearchParams({
    access_token: pageToken,
    limit: String(conversationLimit),
    fields: `id,updated_time,participants.limit(10){id,name},messages.limit(${messageLimit}){id,message,created_time,from}`,
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${pageId}/conversations?${params.toString()}`);
  const payload = await handleApiResponse<FacebookConversationResponse>(res);

  const items: FacebookPageMessageItem[] = [];

  // Flatten conversation messages into individual incoming inbox items.
  for (const conversation of payload.data ?? []) {
    for (const message of conversation.messages?.data ?? []) {
      // Exclude messages missing required content or sender information.
      if (!message.id || !message.message || !message.from?.id || !message.from?.name) {
        continue;
      }

      // Keep only user-side messages in the inbox stream.
      if (message.from.id === pageId) {
        continue;
      }

      items.push({
        conversationId: conversation.id,
        messageId: message.id,
        text: message.message,
        createdTime: message.created_time ?? conversation.updated_time ?? new Date().toISOString(),
        senderId: message.from.id,
        senderName: message.from.name,
      });
    }
  }

  return items;
}

/**
 * Sends a Messenger text message from a Facebook Page to a recipient
 * identified by a Page-Scoped User ID (PSID).
 *
 * Trims the supplied message text, validates required input, and
 * submits a JSON request to the Facebook Page messaging endpoint
 * using the RESPONSE messaging type.
 *
 * @param pageId - External identifier of the sending Facebook Page.
 * @param pageToken - Page Access Token used for API authentication.
 * @param recipientId - Page-Scoped User ID of the intended recipient.
 * @param text - Text content of the outbound Messenger message.
 *
 * @returns A promise resolving to the identifier assigned to the
 * message by the Facebook Graph API.
 *
 * @throws {Error} When the Page ID, recipient ID, or message text is missing.
 * @throws {Error} When the Facebook Graph API request fails.
 * @throws {Error} When the API response contains no valid message identifier.
 * @throws {SyntaxError} When the response contains invalid JSON.
 * @throws {TypeError} When the underlying network request fails.
 *
 * @remarks
 * This function does not independently validate the Page Access Token,
 * recipient association, messaging permissions, or reply eligibility.
 *
 * Only text messages are supported by this implementation.
 * Successful submission does not independently confirm delivery
 * or receipt by the intended user.
 */
export async function sendPageTextMessage(
  pageId: string,
  pageToken: string,
  recipientId: string,
  text: string
): Promise<{ messageId: string }> {
  const trimmed = text.trim();
  if (!pageId || !recipientId || !trimmed) {
    throw new Error('Page ID, recipient ID, and message text are required.');
  }

  const params = new URLSearchParams({
    access_token: pageToken,
  });

  const res = await fetch(`${GRAPH_API_BASE_URL}/${pageId}/messages?${params.toString()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_type: 'RESPONSE',
      recipient: { id: recipientId },
      message: { text: trimmed },
    }),
  });

  const payload = await handleApiResponse<SendPageMessageResponse>(res);

  // Ensure the API returned an identifier for the submitted message.
  const messageId = String(payload.message_id ?? '').trim();
  if (!messageId) {
    throw new Error('No message ID returned from Facebook API.');
  }

  return { messageId };
}
