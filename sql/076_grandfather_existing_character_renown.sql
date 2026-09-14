-- Grandfather characters already on a guild roster before the side-quest
-- system existed straight to max renown (1000/1000), so they don't lose
-- access to guild bonuses they've already earned narratively.
INSERT INTO character_guild_renown (
  westmarches_character_id,
  character_name,
  guild_id,
  renown
)
SELECT
  m.westmarches_character_id,
  m.character_name,
  m.guild_id,
  1000
FROM guild_roster_memberships m
ON CONFLICT (westmarches_character_id, guild_id) DO UPDATE
SET renown = GREATEST(character_guild_renown.renown, 1000),
    character_name = EXCLUDED.character_name,
    updated_at = NOW();
