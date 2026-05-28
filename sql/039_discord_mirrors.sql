ALTER TABLE starting_graces ADD COLUMN IF NOT EXISTS discord_message_id TEXT;

CREATE TABLE IF NOT EXISTS discord_wiki_sections (
  wiki_slug TEXT NOT NULL,
  section_index INTEGER NOT NULL,
  section_heading TEXT,
  discord_message_id TEXT,
  PRIMARY KEY (wiki_slug, section_index)
);
