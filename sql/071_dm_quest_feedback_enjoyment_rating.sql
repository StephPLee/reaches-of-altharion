ALTER TABLE dm_quest_feedback_responses
  ADD COLUMN IF NOT EXISTS enjoyment_rating SMALLINT CHECK (enjoyment_rating BETWEEN 1 AND 5);
