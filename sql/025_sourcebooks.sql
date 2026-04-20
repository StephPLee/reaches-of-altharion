CREATE TABLE IF NOT EXISTS sourcebook_entries (
  id BIGSERIAL PRIMARY KEY,
  list_type TEXT NOT NULL CHECK (list_type IN ('allowed', 'not_allowed')),
  title TEXT NOT NULL,
  publisher TEXT NOT NULL DEFAULT '',
  book_type TEXT NOT NULL DEFAULT '',
  edition TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS sourcebook_entries_list_title_idx
  ON sourcebook_entries (list_type, LOWER(title));

CREATE INDEX IF NOT EXISTS sourcebook_entries_list_sort_idx
  ON sourcebook_entries (list_type, sort_order, LOWER(title));

WITH sourcebooks (list_type, title, publisher, book_type, edition, sort_order) AS (
  VALUES
    ('not_allowed', 'Book of Ebon Tides', 'Kobold Press', 'Partnered sourcebook', '5e', 10),
    ('not_allowed', 'Grim Hollow: Races and Dark Bargains', 'Ghostfire Gaming', 'Partnered player options', '5e', 20),
    ('not_allowed', 'Iron Hero Feat', 'Third-party', 'Partnered / homebrew feat', '5e', 30),
    ('not_allowed', 'Obojima: Tales from the Tall Grass consumables', '1985 Games', 'Partnered item content', '5e', 40),
    ('not_allowed', 'Dungeons & Dragons vs. Rick and Morty', 'Wizards of the Coast', 'Boxed adventure product', '5e', 50),
    ('not_allowed', 'The Lord of the Rings Roleplaying', 'Free League', 'Partnered sourcebook', '5e', 60),
    ('not_allowed', 'The Pugilist Class', 'Third-party', 'Partnered class', '5e / 5.5e', 70),
    ('allowed', 'Basic Rules (2014)', 'Wizards of the Coast', 'Core rules', '5e', 10),
    ('allowed', 'Elemental Evil Player''s Companion', 'Wizards of the Coast', 'Player supplement', '5e', 20),
    ('allowed', 'Player''s Handbook (2014)', 'Wizards of the Coast', 'Core rules', '5e', 30),
    ('allowed', 'Dungeon Master''s Guide (2014)', 'Wizards of the Coast', 'Core rules', '5e', 40),
    ('allowed', 'Monster Manual (2014)', 'Wizards of the Coast', 'Core rules', '5e', 50),
    ('allowed', 'Sword Coast Adventurer''s Guide', 'Wizards of the Coast', 'Setting / player options', '5e', 60),
    ('allowed', 'Xanathar''s Guide to Everything', 'Wizards of the Coast', 'Rules expansion', '5e', 70),
    ('allowed', 'Volo''s Guide to Monsters', 'Wizards of the Coast', 'Monsters / lore', '5e', 80),
    ('allowed', 'Mordenkainen''s Tome of Foes', 'Wizards of the Coast', 'Monsters / lore', '5e', 90),
    ('allowed', 'Guildmasters'' Guide to Ravnica', 'Wizards of the Coast', 'Setting / player options', '5e', 100),
    ('allowed', 'Acquisitions Incorporated', 'Wizards of the Coast', 'Setting / player options', '5e', 110),
    ('allowed', 'Eberron: Rising from the Last War', 'Wizards of the Coast', 'Setting / player options', '5e', 120),
    ('allowed', 'Explorer''s Guide to Wildemount', 'Wizards of the Coast', 'Setting / player options', '5e', 130),
    ('allowed', 'Mythic Odysseys of Theros', 'Wizards of the Coast', 'Setting / player options', '5e', 140),
    ('allowed', 'Tasha''s Cauldron of Everything', 'Wizards of the Coast', 'Rules expansion', '5e', 150),
    ('allowed', 'Van Richten''s Guide to Ravenloft', 'Wizards of the Coast', 'Setting / monsters', '5e', 160),
    ('allowed', 'Fizban''s Treasury of Dragons', 'Wizards of the Coast', 'Rules / monsters', '5e', 170),
    ('allowed', 'Strixhaven: A Curriculum of Chaos', 'Wizards of the Coast', 'Setting / player options', '5e', 180),
    ('allowed', 'Mordenkainen Presents: Monsters of the Multiverse', 'Wizards of the Coast', 'Rules / monsters', '5e', 190),
    ('allowed', 'Spelljammer: Adventures in Space', 'Wizards of the Coast', 'Setting / rules set', '5e', 200),
    ('allowed', 'Bigby Presents: Glory of the Giants', 'Wizards of the Coast', 'Rules expansion', '5e', 210),
    ('allowed', 'Planescape: Adventures in the Multiverse', 'Wizards of the Coast', 'Setting / rules set', '5e', 220),
    ('allowed', 'The Book of Many Things', 'Wizards of the Coast', 'Rules expansion', '5e', 230),
    ('allowed', 'Player''s Handbook (2024)', 'Wizards of the Coast', 'Core rules', '5.5e', 240),
    ('allowed', 'Dungeon Master''s Guide (2024)', 'Wizards of the Coast', 'Core rules', '5.5e', 250),
    ('allowed', 'Monster Manual (2024)', 'Wizards of the Coast', 'Core rules', '5.5e', 260),
    ('allowed', 'Eberron: Forge of the Artificer', 'Wizards of the Coast', 'Setting / player options', '5.5e', 270),
    ('allowed', 'Heroes of Faerun', 'Wizards of the Coast', 'Setting / player options', '5.5e', 280),
    ('allowed', 'Adventures in Faerun', 'Wizards of the Coast', 'Setting / rules support', '5.5e', 290),
    ('allowed', 'Tal''Dorei Campaign Setting Reborn', 'Darrington Press', 'Partnered sourcebook', '5e', 300),
    ('allowed', 'Dungeons of Drakkenheim', 'Ghostfire Gaming', 'Partnered setting book', '5e', 310),
    ('allowed', 'Sebastian Crowe''s Guide to Drakkenheim', 'Ghostfire Gaming', 'Partnered setting / player options', '5e', 320),
    ('allowed', 'Humblewood Campaign Setting', 'Hit Point Press', 'Partnered setting book', '5e', 330),
    ('allowed', 'Humblewood Tales', 'Hit Point Press', 'Partnered supplement', 'Mixed', 340),
    ('allowed', 'Tome of Beasts 1', 'Kobold Press', 'Partnered monster book', '5e', 350),
    ('allowed', 'Flee, Mortals!', 'MCDM', 'Partnered monster book', '5e', 360),
    ('allowed', 'Where Evil Lives', 'MCDM', 'Partnered encounter / monster book', '5e', 370),
    ('allowed', 'Grim Hollow: Player Pack', 'Ghostfire Gaming', 'Partnered player options', '5e', 380),
    ('allowed', 'Grim Hollow: Player''s Guide', 'Ghostfire Gaming', 'Partnered sourcebook', '5.5e', 390),
    ('allowed', 'Grim Hollow: Campaign Guide', 'Ghostfire Gaming', 'Partnered setting book', '5.5e', 400),
    ('allowed', 'Tales from the Shadows', 'Kobold Press', 'Partnered sourcebook', '5e', 410),
    ('allowed', 'The Illrigger Revised', 'MCDM', 'Partnered class', '5e', 420),
    ('allowed', 'The Griffon''s Saddlebag: Book Two', 'The Griffon''s Saddlebag', 'Partnered item book', '5e', 430),
    ('allowed', 'Heliana''s Guide to Monster Hunting: Part 1', 'Loot Tavern', 'Partnered sourcebook', 'Mixed', 440),
    ('allowed', 'Obojima: Tales from the Tall Grass', '1985 Games', 'Partnered setting book', '5e', 450),
    ('allowed', 'Valda''s Spire of Secrets: Player Pack', 'Mage Hand Press', 'Partnered player options', '5e', 460),
    ('allowed', 'Ruins of Symbaroum: Setting Handbook', 'Free League', 'Partnered setting book', '5e', 470),
    ('allowed', 'The Crooked Moon Part One: Player Options & Campaign Setting', 'Legends of Avantris', 'Partnered sourcebook', 'Mixed', 480),
    ('allowed', 'Exploring Eberron (2024)', 'Visionary Creative / Keith Baker', 'Partnered setting book', '5.5e', 490)
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
