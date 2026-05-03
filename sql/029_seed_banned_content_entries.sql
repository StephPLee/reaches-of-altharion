WITH sourcebooks (list_type, title, publisher, book_type, edition, sort_order) AS (
  VALUES
    ('allowed', 'Monsters of Drakkenheim', 'Ghostfire Gaming', 'Partnered monster book', '5e', 315),
    ('allowed', 'Cthulhu by Torchlight', '', 'Partnered player options', '5e', 500)
)
INSERT INTO sourcebook_entries (
  list_type,
  title,
  publisher,
  book_type,
  edition,
  sort_order,
  is_published
)
SELECT
  list_type,
  title,
  publisher,
  book_type,
  edition,
  sort_order,
  true
FROM sourcebooks
ON CONFLICT (list_type, (LOWER(title))) DO UPDATE
SET
  publisher = EXCLUDED.publisher,
  book_type = EXCLUDED.book_type,
  edition = EXCLUDED.edition,
  sort_order = EXCLUDED.sort_order,
  is_published = true,
  updated_at = NOW();

WITH banned_content (sourcebook_title, content_type, title, notes, sort_order) AS (
  VALUES
    ('Cthulhu by Torchlight', 'Spells and subclasses', 'All spells and subclasses', 'Any spell and subclass from Cthulhu by Torchlight is banned.', 10),
    ('Monsters of Drakkenheim', 'Magic item', 'Bracers of Arc Lightning', '', 10),
    ('Monsters of Drakkenheim', 'Magic item', 'Charged Gauntlets', '', 20),
    ('Monsters of Drakkenheim', 'Magic item', 'Crown of Westemar', '', 30),
    ('Monsters of Drakkenheim', 'Magic item', 'Greater Rejuvenation Potion', '', 40),
    ('Monsters of Drakkenheim', 'Magic item', 'Necromancer''s Armor', '', 50),
    ('Monsters of Drakkenheim', 'Magic item', 'Rejuvenation Potion', '', 60),
    ('Monsters of Drakkenheim', 'Magic item', 'Time Dilation Medallion', '', 70),
    ('Monsters of Drakkenheim', 'Magic item', 'Vampire Blood Potion', '', 80),
    ('Player''s Handbook (2014)', 'Magic item', 'Spell Gem', '', 10)
)
INSERT INTO banned_content_entries (
  sourcebook_entry_id,
  content_type,
  title,
  notes,
  sort_order,
  is_published
)
SELECT
  sourcebook_entries.id,
  banned_content.content_type,
  banned_content.title,
  banned_content.notes,
  banned_content.sort_order,
  true
FROM banned_content
INNER JOIN sourcebook_entries
  ON sourcebook_entries.list_type = 'allowed'
  AND LOWER(sourcebook_entries.title) = LOWER(banned_content.sourcebook_title)
ON CONFLICT (sourcebook_entry_id, (LOWER(content_type)), (LOWER(title))) DO UPDATE
SET
  notes = EXCLUDED.notes,
  sort_order = EXCLUDED.sort_order,
  is_published = true,
  updated_at = NOW();
