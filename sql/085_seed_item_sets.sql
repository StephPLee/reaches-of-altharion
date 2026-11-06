-- Each set is its own subcategory. Pieces keep their listed order via
-- sort_order instead of being sorted alphabetically.
INSERT INTO homebrew_entries (
  section,
  title,
  slug,
  body_markdown,
  sort_order,
  is_published
)
VALUES
  ('item-sets', 'Erevale''s Legacy Set', 'item-set-erevales-legacy', '', 10, true),
  ('item-sets', 'Relithia''s Legacy Set', 'item-set-relithias-legacy', '', 20, true),
  ('item-sets', 'Calculated Risk Set', 'item-set-calculated-risk', '', 30, true),
  ('item-sets', 'Surgeons Kit', 'item-set-surgeons-kit', '', 40, true)
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  body_markdown = EXCLUDED.body_markdown,
  sort_order = EXCLUDED.sort_order,
  is_published = EXCLUDED.is_published,
  updated_at = NOW();

WITH source_items (entry_slug, label, href, sort_order) AS (
  VALUES
    ('item-set-erevales-legacy', 'Erevale''s Final Mercy - Legendary Sniper Rifle', 'https://www.dndbeyond.com/magic-items/10808600-erevales-final-mercy', 10),
    ('item-set-erevales-legacy', 'Erevale''s Shroud - Legendary Wondrous Item', 'https://www.dndbeyond.com/magic-items/10808836-erevales-shroud', 20),
    ('item-set-erevales-legacy', 'Erevale''s Vestment - Legendary Light Armor', 'https://www.dndbeyond.com/magic-items/10809030-erevales-vestment', 30),

    ('item-set-relithias-legacy', 'Relithia''s Justice - Legendary Crossbow, Hand', 'https://www.dndbeyond.com/magic-items/10782693-relithias-justice', 10),
    ('item-set-relithias-legacy', 'Relithia''s Stride - Legendary Wondrous Item', 'https://www.dndbeyond.com/magic-items/10746228-relithias-stride', 20),
    ('item-set-relithias-legacy', 'Relithia''s Grace - Legendary Wondrous Item', 'https://www.dndbeyond.com/magic-items/10727451-relithias-grace', 30),

    ('item-set-calculated-risk', 'Strategy - Legendary Wondrous Item', 'https://www.dndbeyond.com/magic-items/10892547-strategy', 10),
    ('item-set-calculated-risk', 'Instinct - Legendary Wondrous Item', 'https://www.dndbeyond.com/magic-items/10892554-instinct', 20),

    ('item-set-surgeons-kit', 'Surgeons Gloves - Uncommon Wondrous Item', 'https://www.dndbeyond.com/magic-items/11120555-surgeons-gloves', 10),
    ('item-set-surgeons-kit', 'Surgeons Coat - Rare Wondrous Item', 'https://www.dndbeyond.com/magic-items/11120583-surgeons-coat', 20),
    ('item-set-surgeons-kit', 'Surgeons Scalpel - Very Rare Wondrous Item', 'https://www.dndbeyond.com/magic-items/11120597-surgeons-scalpel', 30),
    ('item-set-surgeons-kit', 'Surgeons Mask - Legendary Wondrous Item', 'https://www.dndbeyond.com/magic-items/11120675-surgeons-mask', 40),
    ('item-set-surgeons-kit', 'Surgeons Handbag - Artifact Wondrous Item', 'https://www.dndbeyond.com/magic-items/11081170-surgeons-handbag', 50)
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
  s.sort_order,
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
