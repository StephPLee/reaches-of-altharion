-- quest_call_responses was originally deployed with a bracket-per-call
-- design (discord_user_id + brackets TEXT[]). That data is transient
-- (quest calls expire within 2 hours) and doesn't map cleanly onto the
-- character-based design that replaced it, so we recreate the table.
DROP TABLE IF EXISTS quest_call_responses;

CREATE TABLE quest_call_responses (
  quest_call_id INTEGER NOT NULL REFERENCES quest_calls (id) ON DELETE CASCADE,
  discord_user_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  character_name TEXT NOT NULL,
  character_level INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (quest_call_id, discord_user_id, character_id)
);
