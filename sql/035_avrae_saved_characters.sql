CREATE TABLE IF NOT EXISTS avrae_saved_characters (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ddb_character_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  name TEXT NOT NULL,
  payload JSONB NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ddb_character_id)
);

CREATE INDEX IF NOT EXISTS avrae_saved_characters_user_idx
  ON avrae_saved_characters (user_id, updated_at DESC);

