ALTER TABLE "post_comments"
ADD COLUMN "commenter" JSONB;

UPDATE "post_comments"
SET "commenter" = jsonb_build_object(
  'id', "commenter_id",
  'name', "commenter_name",
  'image', NULL
)
WHERE "commenter_id" IS NOT NULL OR "commenter_name" IS NOT NULL;

ALTER TABLE "post_comments"
DROP COLUMN "commenter_id",
DROP COLUMN "commenter_name";
