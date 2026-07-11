ALTER TABLE reward_events
  ADD COLUMN IF NOT EXISTS calendar_event_id BIGINT UNIQUE
  REFERENCES calendar_events(id) ON DELETE SET NULL;