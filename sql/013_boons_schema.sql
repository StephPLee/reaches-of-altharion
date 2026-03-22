CREATE TABLE boons (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  content_markdown TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX boons_title_idx
  ON boons (LOWER(title), id);

DROP TRIGGER IF EXISTS set_boons_updated_at ON boons;
CREATE TRIGGER set_boons_updated_at
BEFORE UPDATE ON boons
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE homebrew_automation_entries
ADD COLUMN IF NOT EXISTS boon_id BIGINT REFERENCES boons(id) ON DELETE CASCADE;

ALTER TABLE homebrew_automation_entries
DROP CONSTRAINT IF EXISTS homebrew_automation_anchor_mode_check;

ALTER TABLE homebrew_automation_entries
ADD CONSTRAINT homebrew_automation_anchor_mode_check
CHECK (
  anchor_mode IN ('heading', 'link', 'item', 'guild_upgrade', 'starting_grace', 'boon')
);

ALTER TABLE homebrew_automation_entries
DROP CONSTRAINT IF EXISTS homebrew_automation_target_presence_check;

ALTER TABLE homebrew_automation_entries
ADD CONSTRAINT homebrew_automation_target_presence_check
CHECK (
  (
    anchor_mode IN ('heading', 'link')
    AND homebrew_entry_id IS NOT NULL
    AND homebrew_section_item_id IS NULL
    AND guild_upgrade_id IS NULL
    AND starting_grace_id IS NULL
    AND boon_id IS NULL
  )
  OR (
    anchor_mode = 'item'
    AND homebrew_entry_id IS NOT NULL
    AND homebrew_section_item_id IS NOT NULL
    AND guild_upgrade_id IS NULL
    AND starting_grace_id IS NULL
    AND boon_id IS NULL
  )
  OR (
    anchor_mode = 'guild_upgrade'
    AND guild_upgrade_id IS NOT NULL
    AND homebrew_section_item_id IS NULL
    AND starting_grace_id IS NULL
    AND boon_id IS NULL
  )
  OR (
    anchor_mode = 'starting_grace'
    AND starting_grace_id IS NOT NULL
    AND homebrew_section_item_id IS NULL
    AND guild_upgrade_id IS NULL
    AND boon_id IS NULL
  )
  OR (
    anchor_mode = 'boon'
    AND boon_id IS NOT NULL
    AND homebrew_section_item_id IS NULL
    AND guild_upgrade_id IS NULL
    AND starting_grace_id IS NULL
  )
);
