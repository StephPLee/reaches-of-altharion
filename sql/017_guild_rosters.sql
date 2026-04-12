CREATE TABLE IF NOT EXISTS guild_roster_memberships (
  id BIGSERIAL PRIMARY KEY,
  guild_id BIGINT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  westmarches_character_id TEXT NOT NULL UNIQUE,
  character_name TEXT NOT NULL,
  discord_user_id TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS guild_roster_memberships_guild_idx
  ON guild_roster_memberships (guild_id, LOWER(character_name), id);

CREATE INDEX IF NOT EXISTS guild_roster_memberships_discord_user_idx
  ON guild_roster_memberships (discord_user_id, LOWER(character_name), id);
