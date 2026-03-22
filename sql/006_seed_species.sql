INSERT INTO homebrew_entries (
  section,
  title,
  slug,
  body_markdown,
  sort_order,
  is_published
)
VALUES
  ('species', 'Species', 'species', '', 10, true)
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  body_markdown = EXCLUDED.body_markdown,
  sort_order = EXCLUDED.sort_order,
  is_published = EXCLUDED.is_published,
  updated_at = NOW();

WITH species_items (label, href) AS (
  VALUES
    ('Anubi', 'https://www.dndbeyond.com/species/1669610-anubi'),
    ('Dullahan', 'https://www.dndbeyond.com/species/2057874-dullahan'),
    ('Kitsune', 'https://www.dndbeyond.com/species/2019700-kitsune'),
    ('Mountain Tabaxi', 'https://www.dndbeyond.com/species/2036310-mountain-tabaxi'),
    ('Shadow Elf', 'https://www.dndbeyond.com/species/2057890-shadow-elf'),
    ('Simic Hybrid (2024)', 'https://www.dndbeyond.com/species/2110060-simic-hybrid-updated'),
    ('Vermin Kin', 'https://www.dndbeyond.com/species/2058822-vermin-kin#Vermin-kinRaceDetails')
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
  s.label,
  s.href,
  0,
  true
FROM species_items s
JOIN homebrew_entries e
  ON e.slug = 'species'
WHERE NOT EXISTS (
  SELECT 1
  FROM homebrew_section_items existing
  WHERE existing.homebrew_entry_id = e.id
    AND existing.label = s.label
    AND COALESCE(existing.parent_item_id, 0) = 0
);

WITH vermin_parent AS (
  SELECT id, homebrew_entry_id
  FROM homebrew_section_items
  WHERE href = 'https://www.dndbeyond.com/species/2058822-vermin-kin#Vermin-kinRaceDetails'
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
  vp.homebrew_entry_id,
  vp.id,
  child.label,
  child.href,
  0,
  true
FROM vermin_parent vp
JOIN (
  VALUES
    ('Plaguemaster', 'https://www.dndbeyond.com/species-options/983190-plague-master'),
    ('Power Vermin', 'https://www.dndbeyond.com/species-options/984996-power-vermin'),
    ('Shadow Vermin', 'https://www.dndbeyond.com/species-options/983394-shadow-vermin')
) AS child(label, href)
  ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM homebrew_section_items existing
  WHERE existing.parent_item_id = vp.id
    AND existing.label = child.label
);

WITH species_targets AS (
  SELECT id AS item_id
  FROM homebrew_section_items
  WHERE href IN (
    'https://www.dndbeyond.com/species/2019700-kitsune',
    'https://www.dndbeyond.com/species/2058822-vermin-kin#Vermin-kinRaceDetails'
  )
)
DELETE FROM homebrew_automation_entries
WHERE homebrew_section_item_id IN (SELECT item_id FROM species_targets);

WITH automation_rows AS (
  SELECT
    e.id AS homebrew_entry_id,
    i.id AS homebrew_section_item_id,
    'Kitsune Avrae Automation'::text AS panel_title,
    'Expand to view setup and download options'::text AS panel_subtitle
  FROM homebrew_section_items i
  JOIN homebrew_entries e ON e.id = i.homebrew_entry_id
  WHERE i.href = 'https://www.dndbeyond.com/species/2019700-kitsune'

  UNION ALL

  SELECT
    e.id,
    i.id,
    'Vermin Kin Avrae Setup',
    'Expand to view setup and download options'
  FROM homebrew_section_items i
  JOIN homebrew_entries e ON e.id = i.homebrew_entry_id
  WHERE i.href = 'https://www.dndbeyond.com/species/2058822-vermin-kin#Vermin-kinRaceDetails'
)
INSERT INTO homebrew_automation_entries (
  homebrew_entry_id,
  homebrew_section_item_id,
  anchor_mode,
  panel_title,
  panel_subtitle,
  sort_order
)
SELECT
  homebrew_entry_id,
  homebrew_section_item_id,
  'item',
  panel_title,
  panel_subtitle,
  0
FROM automation_rows;

WITH automation_lookup AS (
  SELECT id, panel_title
  FROM homebrew_automation_entries
  WHERE panel_title IN ('Kitsune Avrae Automation', 'Vermin Kin Avrae Setup')
)
INSERT INTO homebrew_automation_setup_commands (
  automation_entry_id,
  label,
  command,
  sort_order
)
SELECT
  al.id,
  seed.label,
  seed.command,
  seed.sort_order
FROM automation_lookup al
JOIN (
  VALUES
    (
      'Vermin Kin Avrae Setup',
      'Required Snippet',
      '!snippet pp -d1 {{proficiencyBonus}}[poison] -f "Potent Poisons|Once per turn when the Plague-Master deals poison damage they can add their proficiency bonus to the damage as poison damage."',
      0
    ),
    (
      'Vermin Kin Avrae Setup',
      'Required CC',
      '!cc "Scatter!" -min 0 -max 1 -reset "long" -dispType "hex" -desc "You can use your bonus action to disengage and dash. You can do this once per long rest."',
      1
    )
) AS seed(panel_title, label, command, sort_order)
  ON seed.panel_title = al.panel_title;

WITH automation_lookup AS (
  SELECT id, panel_title
  FROM homebrew_automation_entries
  WHERE panel_title = 'Kitsune Avrae Automation'
)
INSERT INTO homebrew_automation_code_blocks (
  automation_entry_id,
  title,
  code,
  download_name,
  sort_order
)
SELECT
  al.id,
  'Kitsune',
  $kitsune$!a import _v: 2
name: Fox Fire
automation:
  - type: spell
    id: 2618858
  - type: counter
    counter: "Fox Fire: Faerie Fire"
    amount: "1"
    fixedValue: true
  - type: text
    text: >-
      Kitsunes are well known, in lore, for their exceptional control over
      harmless flames. You can cast Faerie Fire once per day, without expending
      a spell slot, choosing whatever colour you desire instead of the normal
      blue, green, or violet.
proper: false$kitsune$,
  'kitsune.txt',
  0
FROM automation_lookup al;
