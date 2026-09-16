-- Lets players abandon an active side-quest objective (/objective abandon)
-- instead of only being able to reroll or complete it.

ALTER TABLE character_side_quests ADD COLUMN IF NOT EXISTS abandoned_at TIMESTAMPTZ;

ALTER TABLE character_side_quests DROP CONSTRAINT IF EXISTS character_side_quests_status_check;
ALTER TABLE character_side_quests ADD CONSTRAINT character_side_quests_status_check
  CHECK (status IN ('active', 'completed', 'redeemed', 'abandoned'));
