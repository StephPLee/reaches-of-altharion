ALTER TABLE starting_graces ADD COLUMN IF NOT EXISTS discord_message_ids TEXT[] NOT NULL DEFAULT '{}';

UPDATE starting_graces
SET discord_message_ids = ARRAY[discord_message_id]
WHERE discord_message_id IS NOT NULL AND discord_message_ids = '{}';

ALTER TABLE starting_graces DROP COLUMN IF EXISTS discord_message_id;

ALTER TABLE discord_wiki_sections ADD COLUMN IF NOT EXISTS discord_message_ids TEXT[] NOT NULL DEFAULT '{}';

UPDATE discord_wiki_sections
SET discord_message_ids = ARRAY[discord_message_id]
WHERE discord_message_id IS NOT NULL AND discord_message_ids = '{}';

ALTER TABLE discord_wiki_sections DROP COLUMN IF EXISTS discord_message_id;
