INSERT INTO homebrew_entries (
  section,
  title,
  slug,
  body_markdown,
  sort_order,
  is_published
)
SELECT 'subclasses', 'Druid | Circles', 'druid-circles', '', 60, true
WHERE NOT EXISTS (
  SELECT 1
  FROM homebrew_entries
  WHERE section = 'subclasses'
    AND LOWER(title) = LOWER('Druid | Circles')
)
ON CONFLICT (slug) DO UPDATE
SET
  section = EXCLUDED.section,
  title = EXCLUDED.title,
  sort_order = EXCLUDED.sort_order,
  is_published = true,
  updated_at = NOW();

WITH source_entries AS (
  SELECT id
  FROM homebrew_entries
  WHERE section = 'subclasses'
    AND (
      slug IN ('subclasses', 'druid-subclasses')
      OR LOWER(title) IN (LOWER('Subclasses'), LOWER('Druid'))
    )
),
target_entry AS (
  SELECT id
  FROM homebrew_entries
  WHERE section = 'subclasses'
    AND (
      slug = 'druid-circles'
      OR LOWER(title) = LOWER('Druid | Circles')
    )
  ORDER BY
    CASE
      WHEN LOWER(title) = LOWER('Druid | Circles') THEN 0
      ELSE 1
    END,
    id ASC
  LIMIT 1
)
UPDATE homebrew_section_items item
SET
  homebrew_entry_id = target_entry.id,
  updated_at = NOW()
FROM source_entries, target_entry
WHERE item.homebrew_entry_id = source_entries.id;

WITH source_entries AS (
  SELECT id
  FROM homebrew_entries
  WHERE section = 'subclasses'
    AND (
      slug IN ('subclasses', 'druid-subclasses')
      OR LOWER(title) IN (LOWER('Subclasses'), LOWER('Druid'))
    )
),
target_entry AS (
  SELECT id
  FROM homebrew_entries
  WHERE section = 'subclasses'
    AND (
      slug = 'druid-circles'
      OR LOWER(title) = LOWER('Druid | Circles')
    )
  ORDER BY
    CASE
      WHEN LOWER(title) = LOWER('Druid | Circles') THEN 0
      ELSE 1
    END,
    id ASC
  LIMIT 1
)
UPDATE homebrew_automation_entries automation
SET
  homebrew_entry_id = target_entry.id,
  updated_at = NOW()
FROM source_entries, target_entry
WHERE automation.homebrew_entry_id = source_entries.id;

DELETE FROM homebrew_entries entry
WHERE entry.section = 'subclasses'
  AND (
    entry.slug IN ('subclasses', 'druid-subclasses')
    OR LOWER(entry.title) IN (LOWER('Subclasses'), LOWER('Druid'))
  )
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
