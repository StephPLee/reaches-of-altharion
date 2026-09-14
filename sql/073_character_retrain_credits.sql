CREATE TABLE IF NOT EXISTS character_retrain_credits (
  id BIGSERIAL PRIMARY KEY,
  westmarches_character_id TEXT NOT NULL UNIQUE,
  character_name TEXT NOT NULL,
  credits INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
