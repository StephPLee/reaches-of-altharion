CREATE TABLE IF NOT EXISTS guild_roster_character_cooldowns (
  westmarches_character_id TEXT PRIMARY KEY,
  character_name TEXT NOT NULL,
  discord_user_id TEXT NOT NULL,
  last_membership_change_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS guild_roster_character_cooldowns_discord_name_idx
  ON guild_roster_character_cooldowns (discord_user_id, LOWER(character_name));
