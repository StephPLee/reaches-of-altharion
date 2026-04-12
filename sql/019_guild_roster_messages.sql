CREATE TABLE IF NOT EXISTS guild_roster_messages (
  guild_id BIGINT PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
  discord_channel_id TEXT NOT NULL,
  discord_message_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
