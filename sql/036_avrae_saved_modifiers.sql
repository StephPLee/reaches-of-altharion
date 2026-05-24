CREATE TABLE IF NOT EXISTS avrae_saved_modifiers (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  applies_to TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  bonus TEXT NOT NULL DEFAULT '',
  damage TEXT NOT NULL DEFAULT '',
  phrase TEXT NOT NULL DEFAULT '',
  raw_flags TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS avrae_saved_modifiers_user_idx
  ON avrae_saved_modifiers (user_id, updated_at DESC);

