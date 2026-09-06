DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'text') THEN
    ALTER TABLE messages RENAME COLUMN text TO content;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'timestamp') THEN
    ALTER TABLE messages RENAME COLUMN timestamp TO message_time;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'more_details') THEN
    ALTER TABLE messages RENAME COLUMN more_details TO platform_info;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'created_at') THEN
    ALTER TABLE messages DROP COLUMN created_at;
  END IF;
END $$;
