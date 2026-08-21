CREATE TABLE IF NOT EXISTS player_marketplace_request_discord_messages (
  channel_id TEXT PRIMARY KEY,
  message_ids TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
