ALTER TABLE "conversations"
ADD COLUMN "platformConversationId" TEXT;

CREATE INDEX "conversations_platformConversationId_idx"
ON "conversations"("platformConversationId");
