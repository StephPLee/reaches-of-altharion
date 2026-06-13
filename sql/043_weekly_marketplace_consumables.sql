ALTER TABLE weekly_marketplaces
  ADD COLUMN IF NOT EXISTS discord_extra_message_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE weekly_marketplaces
  DROP CONSTRAINT IF EXISTS weekly_marketplaces_source_check;

ALTER TABLE weekly_marketplaces
  ADD CONSTRAINT weekly_marketplaces_source_check
  CHECK (source IN ('generated', 'manual', 'consumables'));
