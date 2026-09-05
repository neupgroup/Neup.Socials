DROP INDEX IF EXISTS "conversations_platformConversationId_idx";

ALTER TABLE "conversations"
DROP COLUMN IF EXISTS "platformConversationId",
ADD COLUMN "moreDetails" JSONB;
