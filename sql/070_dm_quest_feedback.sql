CREATE TABLE IF NOT EXISTS dm_quest_feedback_prompts (
  id BIGSERIAL PRIMARY KEY,
  adventure_id TEXT NOT NULL,
  dm_discord_user_id TEXT NOT NULL,
  recipient_discord_user_id TEXT NOT NULL,
  dm_channel_id TEXT,
  dm_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'submitted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (adventure_id, recipient_discord_user_id)
);

CREATE INDEX IF NOT EXISTS dm_quest_feedback_prompts_dm_adventure_idx
  ON dm_quest_feedback_prompts (dm_discord_user_id, adventure_id);

CREATE TABLE IF NOT EXISTS dm_quest_feedback_responses (
  id BIGSERIAL PRIMARY KEY,
  prompt_id BIGINT NOT NULL UNIQUE REFERENCES dm_quest_feedback_prompts(id) ON DELETE CASCADE,
  storytelling_rating SMALLINT CHECK (storytelling_rating BETWEEN 1 AND 5),
  pacing_rating SMALLINT CHECK (pacing_rating BETWEEN 1 AND 5),
  avrae_rating SMALLINT CHECK (avrae_rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dm_quest_feedback_deliveries (
  adventure_id TEXT NOT NULL,
  dm_discord_user_id TEXT NOT NULL,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (adventure_id, dm_discord_user_id)
);
