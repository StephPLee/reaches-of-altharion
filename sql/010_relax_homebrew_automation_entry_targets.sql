ALTER TABLE homebrew_automation_entries
ALTER COLUMN homebrew_entry_id DROP NOT NULL;

ALTER TABLE homebrew_automation_entries
DROP CONSTRAINT IF EXISTS homebrew_automation_anchor_mode_check;

ALTER TABLE homebrew_automation_entries
ADD CONSTRAINT homebrew_automation_anchor_mode_check
CHECK (anchor_mode IN ('heading', 'link', 'item', 'guild_upgrade'));

ALTER TABLE homebrew_automation_entries
DROP CONSTRAINT IF EXISTS homebrew_automation_target_presence_check;

ALTER TABLE homebrew_automation_entries
ADD CONSTRAINT homebrew_automation_target_presence_check
CHECK (
  (
    anchor_mode IN ('heading', 'link')
    AND homebrew_entry_id IS NOT NULL
    AND guild_upgrade_id IS NULL
  )
  OR (
    anchor_mode = 'item'
    AND homebrew_entry_id IS NOT NULL
    AND homebrew_section_item_id IS NOT NULL
    AND guild_upgrade_id IS NULL
  )
  OR (
    anchor_mode = 'guild_upgrade'
    AND guild_upgrade_id IS NOT NULL
    AND homebrew_section_item_id IS NULL
  )
);
