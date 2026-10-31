const { pool } = require("./db");

// Lists spells that at least one saved spellbook holds, with their holders.
async function listLibrarySpells({ includeHidden }) {
  const result = await pool.query(
    `
    SELECT
      s.id,
      s.name,
      s.level,
      s.is_hidden,
      json_agg(
        json_build_object('spellbookId', b.id, 'characterName', b.character_name)
        ORDER BY LOWER(b.character_name)
      ) AS holders
    FROM library_spells s
    JOIN library_spellbook_spells l ON l.spell_id = s.id
    JOIN library_spellbooks b ON b.id = l.spellbook_id
    WHERE $1::boolean OR s.is_hidden = false
    GROUP BY s.id
    ORDER BY s.level ASC, LOWER(s.name) ASC
    `,
    [Boolean(includeHidden)],
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    level: Number(row.level),
    isHidden: row.is_hidden,
    holders: row.holders.map((holder) => ({
      spellbookId: Number(holder.spellbookId),
      characterName: holder.characterName,
    })),
  }));
}

async function setLibrarySpellHidden({ spellId, isHidden }) {
  const result = await pool.query(
    `
    UPDATE library_spells
    SET is_hidden = $2
    WHERE id = $1
    RETURNING id, name, is_hidden
    `,
    [spellId, isHidden],
  );

  const row = result.rows[0];
  return row ? { id: Number(row.id), name: row.name, isHidden: row.is_hidden } : null;
}

// Returns the removed spellbook's character name, or null if it did not exist.
async function deleteLibrarySpellbook(spellbookId) {
  const result = await pool.query(
    "DELETE FROM library_spellbooks WHERE id = $1 RETURNING character_name",
    [spellbookId],
  );

  return result.rows[0] ? result.rows[0].character_name : null;
}

module.exports = {
  deleteLibrarySpellbook,
  listLibrarySpells,
  setLibrarySpellHidden,
};
