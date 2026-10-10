ALTER TABLE dm_quest_feedback_responses
  ADD COLUMN IF NOT EXISTS side_quest_completed BOOLEAN,
  ADD COLUMN IF NOT EXISTS side_quest_rating SMALLINT CHECK (side_quest_rating BETWEEN 1 AND 5);
