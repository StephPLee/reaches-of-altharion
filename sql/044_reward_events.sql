CREATE TABLE IF NOT EXISTS reward_events (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  currency_id TEXT NOT NULL,
  currency_name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('final_participant_fixed', 'sc_percentage', 'event_quest_fixed')),
  fixed_amount INTEGER NOT NULL DEFAULT 0 CHECK (fixed_amount >= 0),
  non_event_sc_percent INTEGER NOT NULL DEFAULT 0 CHECK (non_event_sc_percent >= 0),
  event_sc_percent INTEGER NOT NULL DEFAULT 0 CHECK (event_sc_percent >= 0),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_discord_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS reward_events_active_idx
  ON reward_events (enabled, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS reward_event_participants (
  event_id BIGINT NOT NULL REFERENCES reward_events(id) ON DELETE CASCADE,
  adventure_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  final_rewarded_at TIMESTAMPTZ,
  PRIMARY KEY (event_id, adventure_id, character_id)
);

CREATE INDEX IF NOT EXISTS reward_event_participants_event_idx
  ON reward_event_participants (event_id, character_id);