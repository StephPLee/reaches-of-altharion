ALTER TABLE weekly_marketplaces
  ADD COLUMN IF NOT EXISTS discord_ping_message_id TEXT;
