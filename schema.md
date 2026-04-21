# Database Schema Overview

This document summarizes tables, fields, and key constraints based on Prisma schema.

## connected_accounts (ConnectedAccount) -> change to linked_account (LinkedAccount)
- id: String, primary key, default cuid()
- platform: String, required
- name: String, optional
- status: String, optional
- owner: String, optional
- lastSyncedAt: DateTime, optional

## linked_account_facebook (LinkedAccountFacebook) -> make this table.
- id: String, references LinkedAccount.id
- token: String, required
- username: String, optional
- platformId: 


## posts (Post)
- id: String, primary key, default cuid()
- postCollectionId: String, optional
- accountId: String, optional
- platform: String, optional
- platformPostId: String, optional
- message: String, optional
- postLink: String, optional
- createdBy: String, optional
- createdOn: DateTime, default now()
- analytics: Json, optional
- logs: String[], default []
- mediaUrls: String[], default []
- indexes: (accountId, createdOn), (postCollectionId), (platformPostId)

## post_collections (PostCollection)
- id: String, primary key, default cuid()
- content: String, required
- mediaUrls: String[], default []
- status: String, required
- author: String, optional
- createdAt: DateTime, default now()
- postsId: String[], default []
- accountIds: String[], default []
- platforms: String[], default []
- ctaType: String, optional
- ctaLink: String, optional
- publishedAt: DateTime, optional
- scheduledAt: DateTime, optional
- originalPostCollectionId: String, optional
- indexes: (status, createdAt)

## uploads (Upload)
- id: String, primary key, default cuid()
- contentName: String, optional
- fileName: String, required
- fileSize: Int, required
- fileType: String, required
- uploadedBy: String, required
- filePath: String, required
- platform: String, required
- contentId: String, required
- uploadedOn: DateTime, default now()
- indexes: (uploadedOn), (fileName)

## errors (ErrorLog)
- id: String, primary key, default cuid()
- process: String, optional
- location: String, optional
- errorMessage: String, optional
- user: String, optional
- context: Json, optional
- timestamp: DateTime, default now()
- count: Int, default 1
- source: String, optional
- message: String, optional
- stack: String, optional
- userId: String, optional
- request: Json, optional
- indexes: (timestamp)

## sync_logs (SyncLog)
- id: String, primary key, default cuid()
- accountId: String, required
- status: String, required
- syncedAt: DateTime, default now()
- postsSynced: Int, optional
- errorMessage: String, optional
- range: Json, optional
- details: Json, optional
- indexes: (accountId, syncedAt)

## sync_log (SyncLogEntry)
- id: String, primary key, default cuid()
- type: String, required
- platform: String, required
- forProfile: String, required, mapped column for_profile
- sinceTime: DateTime, optional, mapped column since_time
- toTime: DateTime, optional, mapped column to_time
- moreInfo: Json, optional, mapped column moreinfo
- createdOn: DateTime, default now(), mapped column created_on
- indexes: (platform, forProfile, createdOn), (type, createdOn)

## space (Space)
- id: String, primary key, default cuid()
- name: String, required
- relations: assets -> SpaceAsset[]

## space_assets (SpaceAsset)
- id: String, primary key, default cuid()
- spaceId: String, required, mapped column space_id
- platform: String, required
- assetId: String, required, mapped column asset_id
- relations:
  - account -> Account (fields: assetId, references: account_id, onDelete: Cascade)
  - space -> Space (fields: spaceId, references: id, onDelete: Cascade)
- unique: (spaceId, platform, assetId)
- indexes: (spaceId), (platform, assetId)

## conversations (Conversation)
- id: String, primary key, default cuid()
- contactId: String, required
- contactName: String, required
- channelId: String, required
- platform: String, required
- lastMessage: String, optional
- lastMessageAt: DateTime, optional
- unread: Boolean, default false
- avatar: String, optional
- createdAt: DateTime, default now()
- indexes: (channelId, contactId), (lastMessageAt)

## conversation_messages (ConversationMessage)
- id: String, primary key, default cuid()
- conversationId: String, required
- platformMessageId: String, optional, unique
- text: String, required
- sender: String, required
- timestamp: DateTime, default now()
- type: String, default "text"
- callEvent: String, optional
- indexes: (conversationId, timestamp)

## system_alerts (SystemAlert)
- id: String, primary key, default cuid()
- type: String, required
- platform: String, required
- payload: Json, optional
- timestamp: DateTime, default now()
- indexes: (timestamp)

## system_config (SystemConfig)
- id: String, primary key, default cuid()
- key: String, required, unique
- value: String, optional
- createdAt: DateTime, default now()
- updatedAt: DateTime, updatedAt

## commentors (Commentor)
- id: String, primary key, default cuid()
- platform: String, required
- onProfile: String, required, mapped column on_profile
- platformUserId: String, required, mapped column platform_user_id
- name: String, required
- firstInteraction: DateTime, default now(), mapped column first_interaction
- createdAt: DateTime, default now(), mapped column created_at
- relations: comments -> Comment[]
- unique: (platform, onProfile, platformUserId)
- indexes: (platform, onProfile)

## comments (Comment)
- id: String, primary key, default cuid()
- by: String, required
- onProfile: String, required, mapped column on_profile
- comment: String, required
- on: DateTime, required
- platform: String, required
- platformCommentId: String, optional, unique, mapped column platform_comment_id
- postId: String, optional, mapped column post_id
- postMessage: String, optional, mapped column post_message
- permalinkUrl: String, optional, mapped column permalink_url
- createdAt: DateTime, default now(), mapped column created_at
- relations: commentor -> Commentor (fields: by, references: id, onDelete: Cascade)
- indexes: (platform, onProfile, on), (by, on)

## identity_unified (IdentityUnified)
- id: String, primary key, default cuid()
- name: String, required
- moreInfo: Json, optional, mapped column more_info
- createdOn: DateTime, default now(), mapped column created_on
- relations: platformEntries -> IdentityPlatform[]

## identity_platform (IdentityPlatform)
- id: String, primary key, default cuid()
- platUserId: String, required, mapped column platuserid
- platform: String, required
- unifiedId: String, required, mapped column unified_id
- relations: unified -> IdentityUnified (fields: unifiedId, references: id, onDelete: Cascade)
- unique: (platform, platUserId)
- indexes: (unifiedId), (platform, platUserId)

## facebook_comments (FacebookComment)
- id: String, primary key, default cuid()
- psid: String, required
- comment: String, required, db type Text
- commentedOn: DateTime, required, mapped column commented_on
- moreInfo: Json, optional, mapped column moreinfo
- indexes: (psid, commentedOn)

## post_comments (PostComment)
- id: String, primary key, default cuid()
- commentId: String, required, unique, mapped column comment_id
- postId: String, required, mapped column post_id
- platform: String, required
- commentedOn: DateTime, required, mapped column commented_on
- commenterId: String, optional, mapped column commenter_id
- commenterName: String, optional, mapped column commenter_name
- commentText: String, optional, db type Text, mapped column comment_text
- createdAt: DateTime, default now(), mapped column created_at
- updatedAt: DateTime, updatedAt, mapped column updated_at
- indexes: (postId, commentedOn), (platform, commentedOn)

## instagram_live_comments (InstagramLiveComment)
- id: String, primary key, default cuid()
- commentId: String, required, unique, mapped column comment_id
- mediaId: String, optional, mapped column media_id
- mediaProductType: String, optional, mapped column media_product_type
- fromId: String, optional, mapped column from_id
- fromUsername: String, optional, mapped column from_username
- selfIgScopedId: String, optional, mapped column self_ig_scoped_id
- text: String, optional
- payload: Json, optional
- createdAt: DateTime, default now(), mapped column created_at
- updatedAt: DateTime, default now(), mapped column updated_at
- indexes: (mediaId), (createdAt)

## instagram_messages (InstagramMessage)
- id: String, primary key, default cuid()
- senderId: String, optional, mapped column sender_id
- recipientId: String, optional, mapped column recipient_id
- eventTimestamp: DateTime, required, mapped column event_timestamp
- messageMid: String, optional, mapped column message_mid
- messageText: String, optional, mapped column message_text
- numEdit: Int, optional, mapped column num_edit
- payload: Json, optional
- createdAt: DateTime, default now(), mapped column created_at
- reactionSummary: Json, optional, mapped column reaction_summary
- indexes: (messageMid), (eventTimestamp), (createdAt)

## accounts (Account)
- account_id: String, primary key
- relations: spaceAssets -> SpaceAsset[]
