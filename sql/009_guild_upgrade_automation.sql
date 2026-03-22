ALTER TABLE homebrew_automation_entries
ADD COLUMN IF NOT EXISTS guild_upgrade_id BIGINT REFERENCES guild_upgrades(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS homebrew_automation_entries_guild_upgrade_idx
  ON homebrew_automation_entries (guild_upgrade_id, sort_order, id);

ALTER TABLE homebrew_automation_entries
DROP CONSTRAINT IF EXISTS homebrew_automation_anchor_mode_check;

ALTER TABLE homebrew_automation_entries
ADD CONSTRAINT homebrew_automation_anchor_mode_check
CHECK (anchor_mode IN ('heading', 'link', 'item', 'guild_upgrade'));
