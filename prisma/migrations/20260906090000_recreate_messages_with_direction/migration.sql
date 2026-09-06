DROP TABLE IF EXISTS messages;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageDirection') THEN
    CREATE TYPE "MessageDirection" AS ENUM ('system', 'received', 'sent');
  END IF;
END $$;

CREATE TABLE messages (
  id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  platform_message_id TEXT NOT NULL,
  content TEXT NOT NULL,
  sender_id TEXT NULL,
  direction "MessageDirection" NOT NULL,
  message_time TIMESTAMP(3) NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  platform_info JSONB NULL,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_platform_message_id_key UNIQUE (platform_message_id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES accounts(id)
);

CREATE INDEX messages_conversation_id_message_time_idx ON messages(conversation_id, message_time);
CREATE INDEX messages_platform_conversation_id_idx ON messages(platform, conversation_id);
