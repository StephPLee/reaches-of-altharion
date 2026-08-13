-- A DM's public call for players ("I'm up to run a quest right now").
-- Players respond via quest_call_responses indicating which level brackets
-- they have a character ready for. Brackets mirror the ranges in
-- getBossDamageQuestMultiplier in bot/interactions.js: 4-8, 9-13, 14-17, 18-20.
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

CREATE TABLE IF NOT EXISTS quest_call_responses (
  quest_call_id INTEGER NOT NULL REFERENCES quest_calls (id) ON DELETE CASCADE,
  discord_user_id TEXT NOT NULL,
  brackets TEXT[] NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (quest_call_id, discord_user_id),
  CHECK (array_length(brackets, 1) > 0)
);
