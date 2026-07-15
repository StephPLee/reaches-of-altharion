ALTER TABLE timeline_events
  ADD COLUMN IF NOT EXISTS is_chapter_marker BOOLEAN NOT NULL DEFAULT false;
