CREATE TABLE IF NOT EXISTS weekly_marketplaces (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('generated', 'manual', 'consumables')),
  content TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'published', 'error')),
  discord_channel_id TEXT,
  discord_message_id TEXT,
  discord_ping_message_id TEXT,
  discord_extra_message_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_at TIMESTAMPTZ,
  error_message TEXT,
  created_by_discord_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS weekly_marketplaces_due_idx
  ON weekly_marketplaces (status, scheduled_for);

CREATE INDEX IF NOT EXISTS weekly_marketplaces_created_idx
  ON weekly_marketplaces (created_at DESC);
