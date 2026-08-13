-- A DM's public call for players ("I'm up to run a quest right now").
-- Players respond via quest_call_responses by picking which of their own
-- WestMarches.games characters they'd like to bring, so the DM can see
-- interest by level (quests run at a level, and characters within +-2
-- levels of that can join).
CREATE TABLE IF NOT EXISTS quest_calls (
  id SERIAL PRIMARY KEY,
  discord_channel_id TEXT NOT NULL,
  discord_message_id TEXT,
  dm_discord_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  close_reason TEXT CHECK (close_reason IN ('manual', 'expired'))
);

CREATE INDEX IF NOT EXISTS quest_calls_open_idx
  ON quest_calls (expires_at)
  WHERE closed_at IS NULL;

-- character_name/character_level are snapshotted at response time (not
-- re-fetched from the WestMarches API on every render).
CREATE TABLE IF NOT EXISTS quest_call_responses (
  quest_call_id INTEGER NOT NULL REFERENCES quest_calls (id) ON DELETE CASCADE,
  discord_user_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  character_name TEXT NOT NULL,
  character_level INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (quest_call_id, discord_user_id, character_id)
);
