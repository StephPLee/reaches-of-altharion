CREATE TABLE IF NOT EXISTS craft_watch_events (
  id BIGSERIAL PRIMARY KEY,
  discord_message_id TEXT NOT NULL UNIQUE,
  discord_thread_id TEXT NOT NULL,
  discord_guild_id TEXT NOT NULL,
  raw_character_name TEXT NOT NULL,
  raw_item_name TEXT NOT NULL,
  match_status TEXT NOT NULL CHECK (match_status IN ('matched', 'unmatched', 'ambiguous', 'error')),
  matched_character_id TEXT,
  matched_character_name TEXT,
  matched_discord_user_id TEXT,
  reward_result JSONB,
  error_message TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS craft_watch_events_status_idx
  ON craft_watch_events (match_status, processed_at DESC);

CREATE INDEX IF NOT EXISTS craft_watch_events_thread_idx
  ON craft_watch_events (discord_thread_id, processed_at DESC);
