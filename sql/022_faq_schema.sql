CREATE TABLE IF NOT EXISTS faq_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faq_entries (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT NOT NULL REFERENCES faq_categories(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT faq_entries_category_question_unique UNIQUE (category_id, question)
);

CREATE INDEX IF NOT EXISTS faq_entries_category_sort_idx
  ON faq_entries (category_id, is_published, sort_order, id);

WITH category_seed(name, description, sort_order) AS (
  VALUES
    (
      'WestMarches.Games',
      'WM.G is where we host our server essentially. This is where DMs submit their sessions and you apply for them, it''s where you submit your characters and where you can give/receive rewards. Go here to find the website and look around. It''s very useful and does a lot for us so please get used to using it. This is also where lore is being built as we go.',
      10
    ),
    ('Character Creation', '', 20),
    ('Guilds', '', 30),
    ('Roleplay', '', 40),
    ('Grim Hollow Transformations', '', 50)
)
INSERT INTO faq_categories (name, description, sort_order)
SELECT name, description, sort_order
FROM category_seed
ON CONFLICT (name) DO UPDATE
SET
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

WITH entry_seed(category_name, question, answer, sort_order) AS (
  VALUES
    (
      'Character Creation',
      'Where do I roll stats?',
      'You roll stats in [Character Rolls](https://discord.com/channels/1417076658460033077/1417136305535451137).',
      10
    ),
    (
      'Character Creation',
      'Is [class/race/item] available on the server?',
      'If the book isn''t listed here it should be available. If it''s a new book it may not have been evaluated for balance by staff yet.',
      20
    ),
    (
      'Character Creation',
      'I can''t find [class/race/item] in the campaigns',
      'Only one person on the server is buying the books, sadly as money is not infinite, she can''t buy all of them at once. There is a thread to request books here which you can add books to that we need. They will be bought when possible until all books are available.',
      30
    ),
    (
      'Guilds',
      'What guilds are there?',
      'There is a list of approved guilds here which tells you what they are and what they do.',
      10
    ),
    (
      'Guilds',
      'How do I join a guild?',
      'Use `/join-guild` to choose which character is joining which guild. Use `/leave-guild` to leave your current guild. You can see the current guild membership in the guild roster channel.',
      20
    ),
    (
      'Roleplay',
      'Can I be in more than one RP at the same time?',
      'No. The server runs on real time, your character cannot be in multiple places at once. This also avoids people just being in 15 RPs at the same time and farming exp rewards. This rule applies if you are in an RP as an NPC because you can''t exploit RP as an NPC to bypass the no exp farming rule above.',
      10
    ),
    (
      'Roleplay',
      'Can I be in an RP and quest at the same time?',
      'Ask your DM please. Some find this very rude because you are not giving their quest your full attention.',
      20
    ),
    (
      'Roleplay',
      'How do I retire a character?',
      'Simply note the character and that you''re retiring them in [misc-logs](https://discord.com/channels/1417076658460033077/1430481335557820538).',
      30
    ),
    (
      'Grim Hollow Transformations',
      'Does the server allow GH transformations?',
      'Simple answer, yes. We do allow the transformations however you don''t have to use them, there are level requirements for each stage of a transformation and you can only gain one during quests designated for them.' || E'\n\n' ||
      'The details of the transformations can be found here which should be accessible to you as long as you have a character in one of the server campaigns on DnD Beyond.' || E'\n\n' ||
      'The levels for each stage are:' || E'\n' ||
      'Stage 1 | Level 7' || E'\n' ||
      'Stage 2 | Level 13' || E'\n' ||
      'Stage 3 | Level 19' || E'\n' ||
      'Stage 4 | Level 20*' || E'\n' ||
      '*For stage 4 for you must also have defeated at least one world boss.',
      10
    )
)
INSERT INTO faq_entries (category_id, question, answer, sort_order, is_published)
SELECT
  faq_categories.id,
  entry_seed.question,
  entry_seed.answer,
  entry_seed.sort_order,
  true
FROM entry_seed
JOIN faq_categories ON faq_categories.name = entry_seed.category_name
ON CONFLICT (category_id, question) DO UPDATE
SET
  answer = EXCLUDED.answer,
  sort_order = EXCLUDED.sort_order,
  is_published = true,
  updated_at = NOW();
