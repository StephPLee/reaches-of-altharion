const pool = require("../db");

// Saves a character's spellbook, replacing any list previously saved for the
// same character. Returns the spells that were new to the library.
async function saveSpellbook({ discordUserId, characterName, messageUrl, spells }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const spellbookResult = await client.query(
      `
      INSERT INTO library_spellbooks (discord_user_id, character_name, source_message_url)
      VALUES ($1, $2, $3)
      ON CONFLICT (discord_user_id, LOWER(character_name)) DO UPDATE
      SET character_name = EXCLUDED.character_name,
          source_message_url = EXCLUDED.source_message_url,
          updated_at = NOW()
      RETURNING id
      `,
      [discordUserId, characterName, messageUrl],
    );
    const spellbookId = spellbookResult.rows[0].id;

    const names = spells.map((spell) => spell.name);
    const levels = spells.map((spell) => spell.level);
    const lowerNames = names.map((name) => name.toLowerCase());

    const insertedResult = await client.query(
      `
      INSERT INTO library_spells (name, level)
      SELECT name, level FROM UNNEST($1::text[], $2::smallint[]) AS s(name, level)
      ON CONFLICT (LOWER(name)) DO NOTHING
      RETURNING LOWER(name) AS key
      `,
      [names, levels],
    );
    const insertedKeys = new Set(insertedResult.rows.map((row) => row.key));

    await client.query(
      "DELETE FROM library_spellbook_spells WHERE spellbook_id = $1",
      [spellbookId],
    );
    await client.query(
      `
      INSERT INTO library_spellbook_spells (spellbook_id, spell_id)
      SELECT $1, id FROM library_spells WHERE LOWER(name) = ANY($2::text[])
      ON CONFLICT DO NOTHING
      `,
      [spellbookId, lowerNames],
    );

    await client.query("COMMIT");

    return {
      newSpells: spells.filter((spell) => insertedKeys.has(spell.name.toLowerCase())),
      totalSpells: spells.length,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { saveSpellbook };
