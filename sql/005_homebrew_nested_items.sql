ALTER TABLE homebrew_section_items
ADD COLUMN IF NOT EXISTS parent_item_id BIGINT REFERENCES homebrew_section_items(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS homebrew_section_items_parent_idx
  ON homebrew_section_items (parent_item_id, sort_order, id);
