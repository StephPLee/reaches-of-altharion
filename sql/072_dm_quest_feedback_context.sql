ALTER TABLE dm_quest_feedback_prompts
  ADD COLUMN IF NOT EXISTS adventure_title TEXT,
  ADD COLUMN IF NOT EXISTS dm_display_name TEXT;
