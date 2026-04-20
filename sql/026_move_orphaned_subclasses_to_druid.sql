INSERT INTO homebrew_entries (
  section,
  title,
  slug,
  body_markdown,
  sort_order,
  is_published
)
VALUES ('subclasses', 'Druid | Circles', 'druid-circles', '', 60, true)
ON CONFLICT (slug) DO UPDATE
SET
  section = EXCLUDED.section,
  title = EXCLUDED.title,
  body_markdown = EXCLUDED.body_markdown,
  sort_order = EXCLUDED.sort_order,
  is_published = true,
  updated_at = NOW();

WITH source_entry AS (
  SELECT id
  FROM homebrew_entries
  WHERE section = 'subclasses'
    AND slug = 'subclasses'
  LIMIT 1
),
target_entry AS (
  SELECT id
  FROM homebrew_entries
  WHERE section = 'subclasses'
    AND (
      slug = 'druid-circles'
      OR LOWER(title) = LOWER('Druid | Circles')
    )
  LIMIT 1
)
UPDATE homebrew_section_items item
SET
  homebrew_entry_id = target_entry.id,
  updated_at = NOW()
FROM source_entry, target_entry
WHERE item.homebrew_entry_id = source_entry.id;

WITH source_entry AS (
  SELECT id
  FROM homebrew_entries
  WHERE section = 'subclasses'
    AND slug = 'subclasses'
  LIMIT 1
),
target_entry AS (
  SELECT id
  FROM homebrew_entries
  WHERE section = 'subclasses'
    AND (
      slug = 'druid-circles'
      OR LOWER(title) = LOWER('Druid | Circles')
    )
  LIMIT 1
)
UPDATE homebrew_automation_entries automation
SET
  homebrew_entry_id = target_entry.id,
  updated_at = NOW()
FROM source_entry, target_entry
WHERE automation.homebrew_entry_id = source_entry.id;

DELETE FROM homebrew_entries entry
WHERE entry.section = 'subclasses'
  AND entry.slug = 'subclasses'
  AND NOT EXISTS (
    SELECT 1
    FROM homebrew_section_items item
    WHERE item.homebrew_entry_id = entry.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM homebrew_automation_entries automation
    WHERE automation.homebrew_entry_id = entry.id
  );
