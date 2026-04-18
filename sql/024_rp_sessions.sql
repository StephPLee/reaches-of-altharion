CREATE TABLE IF NOT EXISTS rp_sessions (
  id SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  started_by_discord_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  active_started_at TIMESTAMPTZ,
  active_seconds BIGINT NOT NULL DEFAULT 0 CHECK (active_seconds >= 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (status = 'active' AND active_started_at IS NOT NULL AND ended_at IS NULL)
    OR (status = 'paused' AND active_started_at IS NULL AND ended_at IS NULL)
    OR (status = 'ended' AND active_started_at IS NULL AND ended_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS rp_sessions_one_open_per_channel_idx
  ON rp_sessions (guild_id, channel_id)
  WHERE status IN ('active', 'paused');

CREATE INDEX IF NOT EXISTS rp_sessions_channel_started_idx
  ON rp_sessions (guild_id, channel_id, started_at DESC);
