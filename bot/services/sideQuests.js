const { ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const pool = require("../db");
const { formatCharacterName } = require("./westMarches");
const { MAGIC_ITEM_RARITIES } = require("./magicItems");

const MAX_ACTIVE_OBJECTIVES = 3;

function mapObjectiveRow(row) {
  return row
    ? {
        id: Number(row.id),
        title: row.title,
        description: row.description,
        guildName: row.guild_name,
      }
    : null;
}

async function getRandomObjectiveForGuild(guildId, characterId) {
  const result = await pool.query(
    `
    SELECT o.id, o.title, o.description, g.name AS guild_name
    FROM side_quest_objectives o
    JOIN guilds g ON g.id = o.guild_id
    WHERE o.guild_id = $1
      AND o.is_published = true
      AND NOT EXISTS (
        SELECT 1
        FROM character_side_quests c
        WHERE c.side_quest_objective_id = o.id
          AND c.westmarches_character_id = $2
          AND c.status IN ('active', 'completed')
      )
    ORDER BY RANDOM()
    LIMIT 1
    `,
    [guildId, characterId],
  );

  return mapObjectiveRow(result.rows[0]);
}

async function getRandomPublishedGuildId() {
  const result = await pool.query(
    `
    SELECT id
    FROM guilds
    WHERE is_published = true
    ORDER BY RANDOM()
    LIMIT 1
    `,
  );

  return result.rows[0] ? Number(result.rows[0].id) : null;
}

async function countActiveObjectivesForCharacter(characterId) {
  const result = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM character_side_quests
    WHERE westmarches_character_id = $1
      AND status = 'active'
    `,
    [characterId],
  );

  return result.rows[0]?.count ?? 0;
}

async function acquireObjectiveForCharacter({
  characterId,
  characterName,
  discordUserId,
  guildId,
}) {
  const activeCount = await countActiveObjectivesForCharacter(characterId);
  if (activeCount >= MAX_ACTIVE_OBJECTIVES) {
    return { status: "cap_reached" };
  }

  const objective = await getRandomObjectiveForGuild(guildId, characterId);
  if (!objective) {
    return { status: "pool_exhausted" };
  }

  const insertResult = await pool.query(
    `
    INSERT INTO character_side_quests (
      westmarches_character_id,
      character_name,
      discord_user_id,
      guild_id,
      side_quest_objective_id
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
    `,
    [characterId, characterName, discordUserId, guildId, objective.id],
  );

  return {
    status: "ok",
    objective,
    characterSideQuestId: Number(insertResult.rows[0].id),
  };
}

async function listActiveObjectivesForCharacter(characterId) {
  const result = await pool.query(
    `
    SELECT c.id, c.character_name, o.id AS objective_id, o.title, o.description, g.name AS guild_name
    FROM character_side_quests c
    JOIN side_quest_objectives o ON o.id = c.side_quest_objective_id
    JOIN guilds g ON g.id = c.guild_id
    WHERE c.westmarches_character_id = $1
      AND c.status = 'active'
    ORDER BY c.acquired_at ASC, c.id ASC
    `,
    [characterId],
  );

  return result.rows.map((row) => ({
    characterSideQuestId: Number(row.id),
    characterName: row.character_name,
    objectiveId: Number(row.objective_id),
    title: row.title,
    description: row.description,
    guildName: row.guild_name,
  }));
}

async function listCharactersWithActiveObjectives(discordUserId) {
  const result = await pool.query(
    `
    SELECT DISTINCT ON (westmarches_character_id)
      westmarches_character_id, character_name
    FROM character_side_quests
    WHERE discord_user_id = $1
      AND status = 'active'
    ORDER BY westmarches_character_id, id
    `,
    [discordUserId],
  );

  return result.rows.map((row) => ({
    id: row.westmarches_character_id,
    name: row.character_name,
  }));
}

async function rerollObjective(characterSideQuestId) {
  const existingResult = await pool.query(
    `
    SELECT westmarches_character_id, guild_id
    FROM character_side_quests
    WHERE id = $1
      AND status = 'active'
    `,
    [characterSideQuestId],
  );
  const existing = existingResult.rows[0];
  if (!existing) {
    return { status: "not_found" };
  }

  const objective = await getRandomObjectiveForGuild(
    Number(existing.guild_id),
    existing.westmarches_character_id,
  );
  if (!objective) {
    return { status: "pool_exhausted" };
  }

  await pool.query(
    `
    UPDATE character_side_quests
    SET side_quest_objective_id = $2,
        acquired_at = NOW()
    WHERE id = $1
    `,
    [characterSideQuestId, objective.id],
  );

  return { status: "ok", objective };
}

async function listCompletedUnredeemedObjectivesForCharacter(characterId) {
  const result = await pool.query(
    `
    SELECT c.id, c.character_name, o.id AS objective_id, o.title, o.description, c.guild_id, g.name AS guild_name
    FROM character_side_quests c
    JOIN side_quest_objectives o ON o.id = c.side_quest_objective_id
    JOIN guilds g ON g.id = c.guild_id
    WHERE c.westmarches_character_id = $1
      AND c.status = 'completed'
    ORDER BY c.completed_at ASC, c.id ASC
    `,
    [characterId],
  );

  return result.rows.map((row) => ({
    characterSideQuestId: Number(row.id),
    characterName: row.character_name,
    objectiveId: Number(row.objective_id),
    title: row.title,
    description: row.description,
    guildId: Number(row.guild_id),
    guildName: row.guild_name,
  }));
}

async function listCharactersWithCompletedUnredeemedObjectives(discordUserId) {
  const result = await pool.query(
    `
    SELECT DISTINCT ON (westmarches_character_id)
      westmarches_character_id, character_name
    FROM character_side_quests
    WHERE discord_user_id = $1
      AND status = 'completed'
    ORDER BY westmarches_character_id, id
    `,
    [discordUserId],
  );

  return result.rows.map((row) => ({
    id: row.westmarches_character_id,
    name: row.character_name,
  }));
}

async function listRedeemedObjectivesForCharacter(characterId, limit = 10) {
  const result = await pool.query(
    `
    SELECT o.title, g.name AS guild_name, c.redeemed_at
    FROM character_side_quests c
    JOIN side_quest_objectives o ON o.id = c.side_quest_objective_id
    JOIN guilds g ON g.id = c.guild_id
    WHERE c.westmarches_character_id = $1
      AND c.status = 'redeemed'
    ORDER BY c.redeemed_at DESC, c.id DESC
    LIMIT $2
    `,
    [characterId, limit],
  );

  return result.rows.map((row) => ({
    title: row.title,
    guildName: row.guild_name,
    redeemedAt: row.redeemed_at,
  }));
}

async function markObjectivesRedeemed(characterSideQuestIds) {
  if (!Array.isArray(characterSideQuestIds) || characterSideQuestIds.length === 0) {
    return [];
  }

  const result = await pool.query(
    `
    UPDATE character_side_quests
    SET status = 'redeemed',
        redeemed_at = NOW()
    WHERE id = ANY($1::bigint[])
      AND status = 'completed'
    RETURNING id, westmarches_character_id, guild_id
    `,
    [characterSideQuestIds],
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    characterId: row.westmarches_character_id,
    guildId: Number(row.guild_id),
  }));
}

async function addRenown({ characterId, characterName, guildId, amount }) {
  if (!amount) {
    return;
  }

  await pool.query(
    `
    INSERT INTO character_guild_renown (
      westmarches_character_id,
      character_name,
      guild_id,
      renown
    )
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (westmarches_character_id, guild_id) DO UPDATE
    SET renown = character_guild_renown.renown + EXCLUDED.renown,
        character_name = EXCLUDED.character_name,
        updated_at = NOW()
    `,
    [characterId, characterName, guildId, amount],
  );
}

async function getAllRenownForCharacter(characterId) {
  const result = await pool.query(
    `
    SELECT r.guild_id, g.name AS guild_name, r.renown
    FROM character_guild_renown r
    JOIN guilds g ON g.id = r.guild_id
    WHERE r.westmarches_character_id = $1
    ORDER BY r.renown DESC, g.name ASC
    `,
    [characterId],
  );

  return result.rows.map((row) => ({
    guildId: Number(row.guild_id),
    guildName: row.guild_name,
    renown: Number(row.renown),
  }));
}

async function incrementRetrainCredit({ characterId, characterName }) {
  await pool.query(
    `
    INSERT INTO character_retrain_credits (
      westmarches_character_id,
      character_name,
      credits
    )
    VALUES ($1, $2, 1)
    ON CONFLICT (westmarches_character_id) DO UPDATE
    SET credits = character_retrain_credits.credits + 1,
        character_name = EXCLUDED.character_name,
        updated_at = NOW()
    `,
    [characterId, characterName],
  );
}

function buildQuestAcquireCharacterRow(discordUserId, characters) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`quest-acquire-character:${discordUserId}`)
    .setPlaceholder("Choose your character...")
    .addOptions(
      characters.slice(0, 25).map((character) => ({
        label: formatCharacterName(character).slice(0, 100),
        value: character.id,
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildQuestRerollCharacterRow(discordUserId, characters) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`quest-reroll-character:${discordUserId}`)
    .setPlaceholder("Choose your character...")
    .addOptions(
      characters.slice(0, 25).map((character) => ({
        label: character.name.slice(0, 100),
        value: character.id,
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildQuestRerollObjectiveRow(discordUserId, characterId, objectives) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`quest-reroll-objective:${discordUserId}:${characterId}`)
    .setPlaceholder("Choose the objective to reroll...")
    .addOptions(
      objectives.slice(0, 25).map((objective) => ({
        label: objective.title.slice(0, 100),
        description: objective.guildName.slice(0, 100),
        value: String(objective.characterSideQuestId),
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

function parseQuestRerollObjectiveCustomId(customId) {
  const prefix = "quest-reroll-objective:";
  if (!customId.startsWith(prefix)) {
    return null;
  }

  const remainder = customId.slice(prefix.length);
  const separatorIndex = remainder.indexOf(":");
  if (separatorIndex === -1) {
    return null;
  }

  return {
    ownerId: remainder.slice(0, separatorIndex),
    characterId: remainder.slice(separatorIndex + 1),
  };
}

function buildQuestRedeemCharacterRow(discordUserId, characters) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`quest-redeem-character:${discordUserId}`)
    .setPlaceholder("Choose your character...")
    .addOptions(
      characters.slice(0, 25).map((character) => ({
        label: character.name.slice(0, 100),
        value: character.id,
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildQuestRedeemObjectivesRow(discordUserId, objectives) {
  const visibleObjectives = objectives.slice(0, 25);
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`quest-redeem-objectives:${discordUserId}`)
    .setPlaceholder("Choose 1-3 completed objectives to redeem...")
    .setMinValues(1)
    .setMaxValues(Math.min(3, visibleObjectives.length))
    .addOptions(
      visibleObjectives.map((objective) => ({
        label: objective.title.slice(0, 100),
        description: objective.guildName.slice(0, 100),
        value: String(objective.characterSideQuestId),
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildQuestRedeemTierRow(discordUserId, redeemCount) {
  const options =
    redeemCount >= 3
      ? [
          {
            value: "hours",
            label: "1 Hour Reward",
            description: "Grant 1 hour of XP and Gold at the character's level.",
          },
          {
            value: "magicitem_plus_hour",
            label: "Magic Item + 1 Hour Reward",
            description: "Roll a magic item and grant 1 hour of XP and Gold.",
          },
          {
            value: "retrain",
            label: "Retrain Credit",
            description: "Bank one free retrain credit for later use.",
          },
        ]
      : [
          {
            value: "hours",
            label: "1 Hour Reward",
            description: "Grant 1 hour of XP and Gold at the character's level.",
          },
          {
            value: "magicitem",
            label: "Magic Item Roll",
            description: "Roll a random magic item at a rarity of your choice.",
          },
        ];

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`quest-redeem-tier:${discordUserId}`)
    .setPlaceholder("Choose your reward...")
    .addOptions(options);

  return new ActionRowBuilder().addComponents(menu);
}

function buildQuestRedeemRarityRow(discordUserId, characterLevel) {
  const eligibleRarities = MAGIC_ITEM_RARITIES.filter(
    (rarity) => characterLevel >= rarity.minLevel,
  );

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`quest-redeem-rarity:${discordUserId}`)
    .setPlaceholder("Select a rarity...")
    .addOptions(
      eligibleRarities.map((rarity) => ({
        label: rarity.label,
        description: `${rarity.description} (requires level ${rarity.minLevel})`,
        value: rarity.value,
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildQuestListCharacterRow(discordUserId, characters) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`quest-list-character:${discordUserId}`)
    .setPlaceholder("Choose your character...")
    .addOptions(
      characters.slice(0, 25).map((character) => ({
        label: formatCharacterName(character).slice(0, 100),
        value: character.id,
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

module.exports = {
  MAX_ACTIVE_OBJECTIVES,
  acquireObjectiveForCharacter,
  addRenown,
  buildQuestAcquireCharacterRow,
  buildQuestListCharacterRow,
  buildQuestRedeemCharacterRow,
  buildQuestRedeemObjectivesRow,
  buildQuestRedeemRarityRow,
  buildQuestRedeemTierRow,
  buildQuestRerollCharacterRow,
  buildQuestRerollObjectiveRow,
  countActiveObjectivesForCharacter,
  getAllRenownForCharacter,
  getRandomObjectiveForGuild,
  getRandomPublishedGuildId,
  incrementRetrainCredit,
  listActiveObjectivesForCharacter,
  listCharactersWithActiveObjectives,
  listCharactersWithCompletedUnredeemedObjectives,
  listCompletedUnredeemedObjectivesForCharacter,
  listRedeemedObjectivesForCharacter,
  markObjectivesRedeemed,
  parseQuestRerollObjectiveCustomId,
  rerollObjective,
};
