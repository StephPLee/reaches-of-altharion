INSERT INTO homebrew_entries (
  section,
  title,
  slug,
  body_markdown,
  sort_order,
  is_published
)
VALUES
  ('familiars', 'CR 0', 'familiars-cr-0', '', 10, true),
  ('familiars', 'CR 2', 'familiars-cr-2', '', 30, true),
  ('familiars', 'CR 6', 'familiars-cr-6', '', 70, true),
  ('familiars', 'CR 10', 'familiars-cr-10', '', 110, true)
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  body_markdown = EXCLUDED.body_markdown,
  sort_order = EXCLUDED.sort_order,
  is_published = EXCLUDED.is_published,
  updated_at = NOW();

WITH source_items (entry_slug, label, href) AS (
  VALUES
    ('familiars-cr-0', 'Giant Bee', 'https://www.dndbeyond.com/monsters/5896170-giant-bee'),

    ('familiars-cr-2', 'Grave-bound Scourge', 'https://www.dndbeyond.com/monsters/6310119-grave-bound-scourge'),
    ('familiars-cr-2', 'Impish Broker', 'https://www.dndbeyond.com/monsters/6309968-impish-broker'),
    ('familiars-cr-2', 'Pseudodragon Sentinel', 'https://www.dndbeyond.com/monsters/6310169-pseudodragon-sentinel'),
    ('familiars-cr-2', 'Quisat', 'https://www.dndbeyond.com/monsters/6310012-quisat'),
    ('familiars-cr-2', 'Slaad Froglet', 'https://www.dndbeyond.com/monsters/6310168-slaad-froglet'),
    ('familiars-cr-2', 'Sphinx of Marvels', 'https://www.dndbeyond.com/monsters/6312707-sphinx-of-marvels'),
    ('familiars-cr-2', 'Spritely Assassin', 'https://www.dndbeyond.com/monsters/6310020-spritely-assassin'),
    ('familiars-cr-2', 'Venomous Serpent', 'https://www.dndbeyond.com/monsters/6310097-venomous-serpent'),

    ('familiars-cr-6', 'Velonasaur', 'https://www.dndbeyond.com/monsters/6301458-velonasaur'),

    ('familiars-cr-10', 'Crucible Beast', 'https://www.dndbeyond.com/monsters/6113678-crucible-beast')
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
);
