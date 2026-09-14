-- Adds a currency-free reward-event rule type: a flat XP/Gold/SC bonus
-- percentage for event quests, instead of requiring a separately
-- configured West Marches event currency.

ALTER TABLE reward_events
  ALTER COLUMN currency_id DROP NOT NULL,
  ALTER COLUMN currency_name DROP NOT NULL;

ALTER TABLE reward_events
  ADD COLUMN IF NOT EXISTS xp_gold_bonus_percent INTEGER NOT NULL DEFAULT 0
    CHECK (xp_gold_bonus_percent >= 0);

ALTER TABLE reward_events DROP CONSTRAINT IF EXISTS reward_events_rule_type_check;
ALTER TABLE reward_events ADD CONSTRAINT reward_events_rule_type_check
  CHECK (rule_type IN ('final_participant_fixed', 'sc_percentage', 'event_quest_fixed', 'quest_bonus_percent'));
