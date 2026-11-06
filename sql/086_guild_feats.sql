-- Guild HQ channel, shown next to the guild name in the Discord guild feats post.
ALTER TABLE guilds
ADD COLUMN IF NOT EXISTS discord_hq_channel_id TEXT;

UPDATE guilds g
SET
  discord_hq_channel_id = v.channel_id,
  updated_at = NOW()
FROM (VALUES
  ('iron-vanguard', '1481565924455616534'),
  ('verdant-accord', '1433866758871322644'),
  ('crucible-of-creation', '1438282595841347744'),
  ('the-ashen-veil', '1437057366993539125'),
  ('dread-legion', '1430483983002632303'),
  ('dragons-den-of-drama', '1455575032292970638'),
  ('the-argent-mark', '1437055800358076416'),
  ('golden-quill', '1431934664129511525'),
  ('black-hand', '1478030989451202782'),
  ('dawnwardens', '1433868673894056020'),
  ('wayfarers-respite', '1474175646514286692')
) AS v(slug, channel_id)
WHERE g.slug = v.slug;

-- One homebrew list per guild (slug "guild-feats-<guild slug>"), ordered like
-- the guilds page. Feats are ordered by tier via sort_order.
INSERT INTO homebrew_entries (
  section,
  title,
  slug,
  body_markdown,
  sort_order,
  is_published
)
SELECT
  'guild-feats',
  g.name,
  'guild-feats-' || g.slug,
  '',
  g.sort_order,
  true
FROM guilds g
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

WITH source_items (guild_slug, label, href, sort_order) AS (
  VALUES
    ('iron-vanguard', 'Vanguard of Iron - T1 Passive', 'https://www.dndbeyond.com/feats/2298869-vanguard-of-iron', 10),

    ('verdant-accord', 'Force of the Land - T1 Passive', 'https://www.dndbeyond.com/feats/2298871-force-of-the-land', 10),

    ('crucible-of-creation', 'The Crucible Forge - T2 Ability', 'https://www.dndbeyond.com/feats/2298882-the-crucible-forge', 20),
    ('crucible-of-creation', 'Mechanical Study - T3 Passive', 'https://www.dndbeyond.com/feats/2298372-mechanical-study', 30),

    ('the-ashen-veil', 'Veil of Solitude - T1 Passive', 'https://www.dndbeyond.com/feats/2201198-veil-of-solitude', 10),
    ('the-ashen-veil', 'Mental Instinct - T2 Passive', 'https://www.dndbeyond.com/feats/2298898-mental-instinct', 20),
    ('the-ashen-veil', 'Predator''s Resurgence - T3 Ability', 'https://www.dndbeyond.com/feats/2298903-predators-resurgence', 30),

    ('dread-legion', 'Legion''s Might (Level 1-8) - T1 Passive', 'https://www.dndbeyond.com/feats/2298947-legions-might-level-1-8', 10),
    ('dread-legion', 'Legion''s Might (Level 9-16) - T1 Passive', 'https://www.dndbeyond.com/feats/2298948-legions-might-level-9-16', 11),
    ('dread-legion', 'Legion''s Might (Level 17+) - T1 Passive', 'https://www.dndbeyond.com/feats/2298950-legions-might-level-17', 12),

    ('dragons-den-of-drama', 'But That''s Not All - T1 Ability', 'https://www.dndbeyond.com/feats/2298957-but-thats-not-all', 10),

    ('the-argent-mark', 'Eyes of the Watcher - T1 Passive', 'https://www.dndbeyond.com/feats/2298960-eyes-of-the-watcher', 10),
    ('the-argent-mark', 'Dead or Alive - T2 Passive', 'https://www.dndbeyond.com/feats/2298964-dead-or-alive', 20),

    ('golden-quill', 'Arcane Supremacy - T1 Ability', 'https://www.dndbeyond.com/feats/2298971-arcane-supremacy', 10),

    ('black-hand', 'Obscured by Shadow - T1 Passive', 'https://www.dndbeyond.com/feats/2298976-obscured-by-shadow', 10),
    ('black-hand', 'Volatile Reagents - T2 Passive', 'https://www.dndbeyond.com/feats/2298980-volatile-reagents', 20),

    ('dawnwardens', 'Blessed Touch - T1 Passive', 'https://www.dndbeyond.com/feats/2298982-blessed-touch', 10),
    ('dawnwardens', 'Consecrated Armoury - T2 Passive', 'https://www.dndbeyond.com/feats/2298986-consecrated-armoury', 20),

    ('wayfarers-respite', 'Old Flask - T1 Ability', 'https://www.dndbeyond.com/feats/2298990-old-flask', 10)
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
  ON e.slug = 'guild-feats-' || s.guild_slug
WHERE NOT EXISTS (
  SELECT 1
  FROM homebrew_section_items existing
  WHERE existing.homebrew_entry_id = e.id
    AND existing.label = s.label
);
