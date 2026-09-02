CREATE TABLE IF NOT EXISTS character_side_quests (
  id BIGSERIAL PRIMARY KEY,
  westmarches_character_id TEXT NOT NULL,
  character_name TEXT NOT NULL,
  discord_user_id TEXT NOT NULL,
  guild_id BIGINT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  side_quest_objective_id BIGINT NOT NULL REFERENCES side_quest_objectives(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'redeemed')),
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  completed_by_discord_user_id TEXT,
  redeemed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS character_side_quests_character_idx
  ON character_side_quests (westmarches_character_id, status, id);
CREATE UNIQUE INDEX IF NOT EXISTS character_side_quests_held_unique_idx
  ON character_side_quests (westmarches_character_id, side_quest_objective_id)
  WHERE status IN ('active', 'completed');
