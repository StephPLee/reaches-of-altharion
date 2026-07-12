CREATE TABLE IF NOT EXISTS sticky_messages (
  id SERIAL PRIMARY KEY,
  discord_channel_id TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  discord_message_id TEXT,
  created_by_discord_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
