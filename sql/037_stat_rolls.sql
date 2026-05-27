CREATE TABLE IF NOT EXISTS stat_roll_sets (
  id SERIAL PRIMARY KEY,
  stats INTEGER[] NOT NULL,
  total INTEGER NOT NULL,
  discord_message_url TEXT,
  rolled_by_discord_user_id TEXT NOT NULL,
  claimed_by_discord_user_id TEXT,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
