CREATE TABLE IF NOT EXISTS library_spells (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 9),
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS library_spells_name_unique
  ON library_spells (LOWER(name));

CREATE TABLE IF NOT EXISTS library_spellbooks (
  id BIGSERIAL PRIMARY KEY,
  discord_user_id TEXT NOT NULL,
  character_name TEXT NOT NULL,
  source_message_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS library_spellbooks_owner_character_unique
  ON library_spellbooks (discord_user_id, LOWER(character_name));

-- Spells stay in library_spells when their last holder is removed, so a
-- staff hide survives a character re-submitting their spellbook.
CREATE TABLE IF NOT EXISTS library_spellbook_spells (
  spellbook_id BIGINT NOT NULL REFERENCES library_spellbooks(id) ON DELETE CASCADE,
  spell_id BIGINT NOT NULL REFERENCES library_spells(id) ON DELETE CASCADE,
  PRIMARY KEY (spellbook_id, spell_id)
);

CREATE INDEX IF NOT EXISTS library_spellbook_spells_spell_id_idx
  ON library_spellbook_spells (spell_id);
