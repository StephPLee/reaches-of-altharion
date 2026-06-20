const { pool } = require("./db");

function mapRow(row) {
  return {
    databaseId: String(row.id),
    ...row.payload,
    id: row.ddb_character_id,
    sourceUrl: row.source_url,
    name: row.name,
    syncedAt: row.synced_at.toISOString(),
  };
}

async function listSavedAvraeCharacters(userId) {
  const result = await pool.query(
    `
    SELECT id, ddb_character_id, source_url, name, payload, synced_at
    FROM avrae_saved_characters
    WHERE user_id = $1
    ORDER BY LOWER(name) ASC, updated_at DESC
    `,
    [userId],
  );

  return result.rows.map(mapRow);
}

async function upsertSavedAvraeCharacter({ userId, character }) {
  const result = await pool.query(
    `
    INSERT INTO avrae_saved_characters (
      user_id,
      ddb_character_id,
      source_url,
      name,
      payload,
      synced_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT (user_id, ddb_character_id)
    DO UPDATE SET
      source_url = EXCLUDED.source_url,
      name = EXCLUDED.name,
      payload = EXCLUDED.payload || jsonb_strip_nulls(jsonb_build_object(
        'hpOverride', avrae_saved_characters.payload->'hpOverride',
        'acOverride', avrae_saved_characters.payload->'acOverride',
        'companionCreatureIds', avrae_saved_characters.payload->'companionCreatureIds',
        'wildShapeCreatureIds', avrae_saved_characters.payload->'wildShapeCreatureIds'
      )),
      synced_at = NOW(),
      updated_at = NOW()
    RETURNING id, ddb_character_id, source_url, name, payload, synced_at
    `,
    [
      userId,
      character.id,
      character.sourceUrl,
      character.name,
      JSON.stringify(character),
    ],
  );

  return mapRow(result.rows[0]);
}

async function updateAvraeCharacterOverrides({
  userId,
  characterId,
  hpOverride,
  acOverride,
  companionCreatureIds,
  wildShapeCreatureIds,
}) {
  const overridesPatch = {};
  if (hpOverride != null) overridesPatch.hpOverride = hpOverride;
  if (acOverride != null) overridesPatch.acOverride = acOverride;
  if (Array.isArray(companionCreatureIds)) {
    overridesPatch.companionCreatureIds = companionCreatureIds;
  }
  if (Array.isArray(wildShapeCreatureIds)) {
    overridesPatch.wildShapeCreatureIds = wildShapeCreatureIds;
  }

  const result = await pool.query(
    `
    UPDATE avrae_saved_characters
    SET
      payload = payload || $3::jsonb,
      updated_at = NOW()
    WHERE user_id = $1
      AND ddb_character_id = $2
    RETURNING id, ddb_character_id, source_url, name, payload, synced_at
    `,
    [userId, characterId, JSON.stringify(overridesPatch)],
  );

  if (result.rowCount === 0) return null;
  return mapRow(result.rows[0]);
}

async function deleteSavedAvraeCharacter({ userId, characterId }) {
  const result = await pool.query(
    `
    DELETE FROM avrae_saved_characters
    WHERE user_id = $1
      AND ddb_character_id = $2
    `,
    [userId, characterId],
  );

  return result.rowCount > 0;
}

module.exports = {
  deleteSavedAvraeCharacter,
  listSavedAvraeCharacters,
  updateAvraeCharacterOverrides,
  upsertSavedAvraeCharacter,
};

