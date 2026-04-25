INSERT INTO guilds (
  name,
  slug,
  emblem_src,
  emblem_alt,
  summary,
  sort_order,
  is_published
)
VALUES (
  'Eclipsed Choir',
  'eclipsed-choir',
  '',
  'Eclipsed Choir emblem',
  'A guild newly opened for membership and roster tracking.',
  120,
  true
)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  emblem_src = EXCLUDED.emblem_src,
  emblem_alt = EXCLUDED.emblem_alt,
  summary = EXCLUDED.summary,
  sort_order = EXCLUDED.sort_order,
  is_published = EXCLUDED.is_published,
  updated_at = NOW();
