CREATE TABLE "messages" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "platformMessageId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "sender" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'text',
  "moreDetails" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "messages_platformMessageId_key" ON "messages"("platformMessageId");
CREATE INDEX "messages_conversationId_timestamp_idx" ON "messages"("conversationId", "timestamp");
CREATE INDEX "messages_platform_conversationId_idx" ON "messages"("platform", "conversationId");
