ALTER TABLE event_boss_damage_log
  ADD COLUMN IF NOT EXISTS base_amount BIGINT,
  ADD COLUMN IF NOT EXISTS quest_level INTEGER CHECK (quest_level IS NULL OR quest_level BETWEEN 4 AND 20),
  ADD COLUMN IF NOT EXISTS quest_multiplier INTEGER CHECK (quest_multiplier IS NULL OR quest_multiplier > 0);
