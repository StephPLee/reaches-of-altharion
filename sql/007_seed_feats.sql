INSERT INTO homebrew_entries (
  section,
  title,
  slug,
  body_markdown,
  sort_order,
  is_published
)
VALUES
  ('feats', 'Feats', 'feats', '', 10, true)
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  body_markdown = EXCLUDED.body_markdown,
  sort_order = EXCLUDED.sort_order,
  is_published = EXCLUDED.is_published,
  updated_at = NOW();

WITH feat_items (label, href) AS (
  VALUES
    ('Art of the Flash Step - General Feat', 'https://www.dndbeyond.com/feats/2221069-art-of-the-flash-step'),
    ('Homebrewed Medicine - General Feat', 'https://www.dndbeyond.com/feats/2267972-homebrewed-medicine'),
    ('The Chain Unshackled - Eldritch Invocation', 'https://www.dndbeyond.com/feats/2264990-eldritch-invocation-the-chain-unshackled'),
    ('Soul of the Unrelenting - General Feat', 'https://www.dndbeyond.com/feats/2199385-soul-of-the-unrelenting'),
    ('Unified Focus - General Feat', 'https://www.dndbeyond.com/feats/2209855-unified-focus'),
    ('Virulent Plaguebringer - General Feat', 'https://www.dndbeyond.com/feats/2192289-virulent-plaguebringer')
)
INSERT INTO homebrew_section_items (
  homebrew_entry_id,
  parent_item_id,
  label,
  href,
  sort_order,
  is_published
)
SELECT
  e.id,
  NULL,
  f.label,
  f.href,
  0,
  true
FROM feat_items f
JOIN homebrew_entries e
  ON e.slug = 'feats'
WHERE NOT EXISTS (
  SELECT 1
  FROM homebrew_section_items existing
  WHERE existing.homebrew_entry_id = e.id
    AND existing.label = f.label
    AND COALESCE(existing.parent_item_id, 0) = 0
);
