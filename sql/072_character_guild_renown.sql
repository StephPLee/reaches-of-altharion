CREATE TABLE IF NOT EXISTS character_guild_renown (
  id BIGSERIAL PRIMARY KEY,
  westmarches_character_id TEXT NOT NULL,
  character_name TEXT NOT NULL,
  guild_id BIGINT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  renown INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (westmarches_character_id, guild_id)
);
