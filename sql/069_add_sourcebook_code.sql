ALTER TABLE sourcebook_entries
  ADD COLUMN IF NOT EXISTS code TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS sourcebook_entries_code_idx
  ON sourcebook_entries (LOWER(code))
  WHERE code <> '';

UPDATE sourcebook_entries
SET title = 'Forgotten Realms: Heroes of Faerun', code = 'FRHoF', updated_at = NOW()
WHERE LOWER(title) = LOWER('Heroes of Faerun');

UPDATE sourcebook_entries
SET title = 'Forgotten Realms: Adventures in Faerun', code = 'FRAiF', updated_at = NOW()
WHERE LOWER(title) = LOWER('Adventures in Faerun');

WITH codes (title, code) AS (
  VALUES
    ('Basic Rules (2014)', 'BR'),
    ('Elemental Evil Player''s Companion', 'EE'),
    ('Player''s Handbook (2014)', 'PHB'),
    ('Dungeon Master''s Guide (2014)', 'DMG'),
    ('Monster Manual (2014)', 'MM'),
    ('Sword Coast Adventurer''s Guide', 'SCAG'),
    ('Xanathar''s Guide to Everything', 'XGtE'),
    ('Volo''s Guide to Monsters', 'VGtM'),
    ('Mordenkainen''s Tome of Foes', 'MToF'),
    ('Guildmasters'' Guide to Ravnica', 'GGtR'),
    ('Acquisitions Incorporated', 'AI'),
    ('Eberron: Rising from the Last War', 'ERftLW'),
    ('Explorer''s Guide to Wildemount', 'EGtW'),
    ('Mythic Odysseys of Theros', 'MOoT'),
    ('Tasha''s Cauldron of Everything', 'TCoE'),
    ('Van Richten''s Guide to Ravenloft', 'VRGtR'),
    ('Fizban''s Treasury of Dragons', 'FToD'),
    ('Strixhaven: A Curriculum of Chaos', 'SACoC'),
    ('Mordenkainen Presents: Monsters of the Multiverse', 'MotM'),
    ('Spelljammer: Adventures in Space', 'SAiS'),
    ('Bigby Presents: Glory of the Giants', 'GotG'),
    ('Planescape: Adventures in the Multiverse', 'PaitM'),
    ('The Book of Many Things', 'TBoMT'),
    ('Player''s Handbook (2024)', 'PHB-2024'),
    ('Dungeon Master''s Guide (2024)', 'DMG-2024'),
    ('Monster Manual (2024)', 'MM-2024'),
    ('Eberron: Forge of the Artificer', 'EFotA'),
    ('Tal''Dorei Campaign Setting Reborn', 'TCSR'),
    ('Dungeons of Drakkenheim', 'DoD'),
    ('Sebastian Crowe''s Guide to Drakkenheim', 'SCGtD'),
    ('Humblewood Campaign Setting', 'HCS'),
    ('Humblewood Tales', 'HWT'),
    ('Tome of Beasts 1', 'ToB1'),
    ('Flee, Mortals!', 'FM'),
    ('Where Evil Lives', 'WEL'),
    ('Grim Hollow: Player Pack', 'GHPP'),
    ('Grim Hollow: Player''s Guide', 'GHPG'),
    ('Grim Hollow: Campaign Guide', 'GHCG'),
    ('Tales from the Shadows', 'TftS'),
    ('The Illrigger Revised', 'TIR'),
    ('The Griffon''s Saddlebag: Book Two', 'GSB2'),
    ('Heliana''s Guide to Monster Hunting: Part 1', 'HGtMH1'),
    ('Obojima: Tales from the Tall Grass', 'OTftTG'),
    ('Valda''s Spire of Secrets: Player Pack', 'VSSPP'),
    ('Ruins of Symbaroum: Setting Handbook', 'RoSSH'),
    ('The Crooked Moon Part One: Player Options & Campaign Setting', 'TCMP1'),
    ('Exploring Eberron (2024)', 'ExEb'),
    ('Monsters of Drakkenheim', 'MoD'),
    ('Cthulhu by Torchlight', 'CbT')
)
UPDATE sourcebook_entries
SET code = codes.code, updated_at = NOW()
FROM codes
WHERE LOWER(sourcebook_entries.title) = LOWER(codes.title);

WITH new_sourcebooks (list_type, title, code, publisher, book_type, edition, sort_order) AS (
  VALUES
    ('allowed', 'Ravenloft: The Horrors Within', 'RtHW', '', '', '', 510),
    ('allowed', 'Steinhardt''s Guide to the Eldritch Hunt Player Pack', 'SGttEHPP', '', '', '', 520),
    ('allowed', 'Valda''s Spire of Secrets Player Pack 2', 'VSSPP2', '', '', '', 530),
    ('allowed', 'Northlands Worldbook', 'NWB', '', '', '', 540),
    ('allowed', 'Dr Dhrolin''s Dictionary of Dinosaurs', 'DDDoD', '', '', '', 550)
)
INSERT INTO sourcebook_entries (
  list_type,
  title,
  code,
  publisher,
  book_type,
  edition,
  sort_order,
  is_published
)
SELECT
  list_type,
  title,
  code,
  publisher,
  book_type,
  edition,
  sort_order,
  true
FROM new_sourcebooks
ON CONFLICT (list_type, (LOWER(title))) DO UPDATE
SET
  code = EXCLUDED.code,
  publisher = EXCLUDED.publisher,
  book_type = EXCLUDED.book_type,
  edition = EXCLUDED.edition,
  sort_order = EXCLUDED.sort_order,
  is_published = true,
  updated_at = NOW();
