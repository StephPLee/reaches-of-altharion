const { pool } = require("./db");

function mapCharacterSideQuestRow(row) {
  return {
    id: Number(row.id),
    westMarchesCharacterId: row.westmarches_character_id,
    characterName: row.character_name,
    guildId: Number(row.guild_id),
    objectiveId: Number(row.side_quest_objective_id),
    title: row.title,
    description: row.description,
    status: row.status,
    acquiredAt: row.acquired_at,
  };
}

async function listActiveObjectivesForCharacters(characterIds) {
  if (!Array.isArray(characterIds) || characterIds.length === 0) {
    return [];
  }

  const result = await pool.query(
    `
    SELECT
      c.id,
      c.westmarches_character_id,
      c.character_name,
      c.guild_id,
      c.side_quest_objective_id,
      o.title,
      o.description,
      c.status,
      c.acquired_at
    FROM character_side_quests c
    JOIN side_quest_objectives o ON o.id = c.side_quest_objective_id
    WHERE c.westmarches_character_id = ANY($1::text[])
      AND c.status = 'active'
    ORDER BY c.westmarches_character_id ASC, c.acquired_at ASC, c.id ASC
    `,
    [characterIds],
  );

  return result.rows.map(mapCharacterSideQuestRow);
}

async function completeObjectives({ characterSideQuestIds, dmDiscordUserId }) {
  if (!Array.isArray(characterSideQuestIds) || characterSideQuestIds.length === 0) {
    return [];
  }

  const result = await pool.query(
    `
    UPDATE character_side_quests
    SET status = 'completed',
        completed_at = NOW(),
        completed_by_discord_user_id = $1
    WHERE id = ANY($2::bigint[])
      AND status = 'active'
    RETURNING
      id,
      westmarches_character_id,
      character_name,
      guild_id,
      side_quest_objective_id,
      status,
      acquired_at
    `,
    [dmDiscordUserId, characterSideQuestIds],
  );

  return result.rows.map(mapCharacterSideQuestRow);
}

module.exports = {
  completeObjectives,
  listActiveObjectivesForCharacters,
};
