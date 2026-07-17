ALTER TABLE craft_watch_events
  ADD COLUMN IF NOT EXISTS confirmation_status TEXT
    CHECK (confirmation_status IS NULL OR confirmation_status IN ('pending', 'confirmed', 'declined')),
  ADD COLUMN IF NOT EXISTS discord_confirm_message_id TEXT;
