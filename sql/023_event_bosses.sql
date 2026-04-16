CREATE TABLE IF NOT EXISTS event_bosses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  max_hp BIGINT NOT NULL CHECK (max_hp > 0),
  current_hp BIGINT NOT NULL CHECK (current_hp >= 0),
  image_url TEXT,
  status_channel_id TEXT,
  status_message_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS event_bosses_one_active_idx
  ON event_bosses (is_active)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS event_boss_damage_log (
  id SERIAL PRIMARY KEY,
  boss_id INTEGER NOT NULL REFERENCES event_bosses(id) ON DELETE CASCADE,
  discord_user_id TEXT NOT NULL,
  amount BIGINT NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'damage' CHECK (entry_type IN ('damage', 'heal')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS event_boss_damage_log_boss_created_idx
  ON event_boss_damage_log (boss_id, created_at DESC);
