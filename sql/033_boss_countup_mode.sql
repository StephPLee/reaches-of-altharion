ALTER TABLE event_bosses
  ADD COLUMN IF NOT EXISTS tracking_mode TEXT NOT NULL DEFAULT 'countdown';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'event_bosses_tracking_mode_check'
  ) THEN
    ALTER TABLE event_bosses
      ADD CONSTRAINT event_bosses_tracking_mode_check
      CHECK (tracking_mode IN ('countdown', 'countup', 'countup_unbounded'));
  END IF;
END $$;
