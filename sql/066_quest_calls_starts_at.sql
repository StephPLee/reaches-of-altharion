-- Add starts_at so a DM can schedule /quest-check for a future time instead
-- of always meaning "right now". quest_calls has live rows in production,
-- so this is additive only (no drop/recreate). Existing rows backfill to
-- NOW() as a placeholder "immediate" value; the app sets starts_at
-- explicitly on every INSERT going forward.
ALTER TABLE quest_calls
  ADD COLUMN starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
