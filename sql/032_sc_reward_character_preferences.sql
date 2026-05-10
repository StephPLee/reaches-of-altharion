CREATE TABLE IF NOT EXISTS sc_reward_character_preferences (
  discord_user_id TEXT PRIMARY KEY,
  westmarches_character_id TEXT NOT NULL,
  character_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sc_reward_character_preferences_updated_idx
  ON sc_reward_character_preferences (updated_at DESC);
