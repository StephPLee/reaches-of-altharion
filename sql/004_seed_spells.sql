INSERT INTO homebrew_entries (
  section,
  title,
  slug,
  body_markdown,
  sort_order,
  is_published
)
VALUES
  ('spells', 'Cantrips', 'spell-cantrips', '', 10, true),
  ('spells', '1st Level Spells', 'spell-1st-level', '', 20, true),
  ('spells', '2nd Level Spells', 'spell-2nd-level', '', 30, true),
  ('spells', '3rd Level Spells', 'spell-3rd-level', '', 40, true),
  ('spells', '4th Level Spells', 'spell-4th-level', '', 50, true),
  ('spells', '5th Level Spells', 'spell-5th-level', '', 60, true),
  ('spells', '6th Level Spells', 'spell-6th-level', '', 70, true),
  ('spells', '7th Level Spells', 'spell-7th-level', '', 80, true),
  ('spells', '8th Level Spells', 'spell-8th-level', '', 90, true),
  ('spells', '9th Level Spells', 'spell-9th-level', '', 100, true)
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  body_markdown = EXCLUDED.body_markdown,
  sort_order = EXCLUDED.sort_order,
  is_published = EXCLUDED.is_published,
  updated_at = NOW();

WITH source_items (entry_slug, label, href) AS (
  VALUES
    ('spell-3rd-level', 'Pocket Singularity - 3rd Level Conjuration Spell', 'https://www.dndbeyond.com/spells/3134183-pocket-singularity'),
    ('spell-3rd-level', 'Wardbreaker - 3rd Level Evocation Spell', 'https://www.dndbeyond.com/spells/3054196-wardbreaker'),

    ('spell-5th-level', 'Find Greater Familiar - 5th Level Conjuration Spell', 'https://www.dndbeyond.com/spells/3127908-find-greater-familiar'),

    ('spell-6th-level', 'Create Grave Guardian - 6th Level Necromancy Spell', 'https://www.dndbeyond.com/spells/2708207-create-grave-guardian'),
    ('spell-6th-level', 'Inverted Density - 6th Level Conjuration Spell', 'https://www.dndbeyond.com/spells/3128509-inverted-density'),

    ('spell-7th-level', 'Call of the Void - 7th Level Transmutation Spell', ''),
    ('spell-7th-level', 'Void Barrier - 7th Level Abjuration Spell', 'https://www.dndbeyond.com/spells/3125383-void-barrier'),

    ('spell-8th-level', 'Luminary Rite - 8th Level Transmutation Spell', ''),
    ('spell-8th-level', 'Puppeteer Avatar - 8th Level Conjuration Spell', 'https://www.dndbeyond.com/spells/2776036-puppeteer-avatar'),

    ('spell-9th-level', 'Paradox Collapse - 9th Level Conjuration Spell', 'https://www.dndbeyond.com/spells/3128532-paradox-collapse')
)
INSERT INTO homebrew_section_items (
  homebrew_entry_id,
  label,
  href,
  sort_order,
  is_published
)
SELECT
  e.id,
  s.label,
  s.href,
  0,
  true
FROM source_items s
JOIN homebrew_entries e
  ON e.slug = s.entry_slug
WHERE NOT EXISTS (
  SELECT 1
  FROM homebrew_section_items existing
  WHERE existing.homebrew_entry_id = e.id
    AND existing.label = s.label
    AND COALESCE(existing.href, '') = COALESCE(s.href, '')
);
