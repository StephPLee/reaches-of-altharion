const { EmbedBuilder } = require("discord.js");
const config = require("../config");
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const pool = require("../db");
const { truncateValue } = require("../utils");
const { getRewardRow } = require("../../shared/rewardTable");

function isWestMarchesConfigured() {
  return Boolean(config.westMarchesApiBaseUrl && config.westMarchesApiKey);
}

async function westMarchesFetch(path, init = {}) {
  if (!isWestMarchesConfigured()) {
    throw new Error("West Marches API is not configured.");
  }

  const response = await fetch(`${config.westMarchesApiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.westMarchesApiKey}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error =
      typeof payload?.error === "string" && payload.error
        ? payload.error
        : `West Marches request failed (${response.status}).`;
    const requestError = new Error(error);
    requestError.status = response.status;
    requestError.payload = payload;
    throw requestError;
  }

  return payload;
}

async function listAllWestMarchesCharacters() {
  const pageSize = 500;
  let page = 1;
  let totalPages = 1;
  const characters = [];

  while (page <= totalPages) {
    const payload = await westMarchesFetch(
      `/characters?page=${page}&pageSize=${pageSize}`,
    );
    const nextCharacters = Array.isArray(payload.data) ? payload.data : [];
    characters.push(...nextCharacters);

    totalPages =
      typeof payload?.pagination?.totalPages === "number" &&
      payload.pagination.totalPages > 0
        ? payload.pagination.totalPages
        : 1;
    page += 1;
  }

  return characters;
}

function isActiveWestMarchesCharacter(character) {
  const normalizedStatus =
    typeof character?.status === "string"
      ? character.status.trim().toUpperCase()
      : "";

  return (
    normalizedStatus !== "RETIRED" &&
    normalizedStatus !== "DELETED" &&
    normalizedStatus !== "ARCHIVED"
  );
}

function formatCharacterName(character) {
  return typeof character?.name === "string" ? character.name.trim() : "";
}

function normalizeCharacterLevel(character) {
  const rawLevel = character?.level;
  const level =
    typeof rawLevel === "number" ? rawLevel : Number.parseInt(rawLevel, 10);

  return Number.isInteger(level) && level > 0 ? level : 0;
}

function isApprovedWestMarchesCharacter(character) {
  return character?.isApproved === true;
}

async function listOwnedActiveWestMarchesCharacters(discordUserId) {
  const characters = await listAllWestMarchesCharacters();
  return characters
    .filter(
      (character) =>
        isActiveWestMarchesCharacter(character) &&
        character?.user?.discordId === discordUserId &&
        typeof character?.id === "string" &&
        formatCharacterName(character),
    )
    .sort((left, right) =>
      formatCharacterName(left).localeCompare(formatCharacterName(right), undefined, {
        sensitivity: "base",
      }),
    );
}

async function listHighestLevelActiveCharactersForDiscordUsers(discordUserIds) {
  const targetUserIds = new Set(discordUserIds);
  const highestByDiscordUserId = new Map();
  const preferences = await listScRewardCharacterPreferences(discordUserIds);
  const preferenceByDiscordUserId = new Map(
    preferences.map((preference) => [preference.discordUserId, preference]),
  );
  const preferredByDiscordUserId = new Map();
  const characters = await listAllWestMarchesCharacters();

  for (const character of characters) {
    const discordUserId = character?.user?.discordId;
    const characterName = formatCharacterName(character);

    if (
      !targetUserIds.has(discordUserId) ||
      !isActiveWestMarchesCharacter(character) ||
      typeof character?.id !== "string" ||
      !characterName
    ) {
      continue;
    }

    const preference = preferenceByDiscordUserId.get(discordUserId);
    if (preference?.characterId === character.id) {
      preferredByDiscordUserId.set(discordUserId, character);
      continue;
    }

    const current = highestByDiscordUserId.get(discordUserId);
    const candidateLevel = normalizeCharacterLevel(character);
    const currentLevel = current ? normalizeCharacterLevel(current) : -1;

    if (
      !current ||
      candidateLevel > currentLevel ||
      (candidateLevel === currentLevel &&
        characterName.localeCompare(formatCharacterName(current), undefined, {
          sensitivity: "base",
        }) < 0)
    ) {
      highestByDiscordUserId.set(discordUserId, character);
    }
  }

  const matched = discordUserIds
    .map((discordUserId) => {
      const character =
        preferredByDiscordUserId.get(discordUserId) ||
        highestByDiscordUserId.get(discordUserId);
      return character
        ? {
            discordUserId,
            characterId: character.id,
            characterName: formatCharacterName(character),
            level: normalizeCharacterLevel(character),
            usedPreference: preferredByDiscordUserId.has(discordUserId),
          }
        : null;
    })
    .filter(Boolean);

  return {
    matched,
    missingUserIds: discordUserIds.filter(
      (discordUserId) =>
        !preferredByDiscordUserId.has(discordUserId) &&
        !highestByDiscordUserId.has(discordUserId),
    ),
  };
}

function mapScRewardCharacterPreference(row) {
  return row
    ? {
        discordUserId: row.discord_user_id,
        characterId: row.westmarches_character_id,
        characterName: row.character_name,
        updatedAt: row.updated_at,
      }
    : null;
}

async function getScRewardCharacterPreference(discordUserId) {
  const result = await pool.query(
    `
    SELECT discord_user_id, westmarches_character_id, character_name, updated_at
    FROM sc_reward_character_preferences
    WHERE discord_user_id = $1
    `,
    [discordUserId],
  );

  return mapScRewardCharacterPreference(result.rows[0]);
}

async function listScRewardCharacterPreferences(discordUserIds) {
  if (!Array.isArray(discordUserIds) || discordUserIds.length === 0) {
    return [];
  }

  const result = await pool.query(
    `
    SELECT discord_user_id, westmarches_character_id, character_name, updated_at
    FROM sc_reward_character_preferences
    WHERE discord_user_id = ANY($1::text[])
    `,
    [discordUserIds],
  );

  return result.rows.map(mapScRewardCharacterPreference).filter(Boolean);
}

async function upsertScRewardCharacterPreference({
  discordUserId,
  characterId,
  characterName,
}) {
  const result = await pool.query(
    `
    INSERT INTO sc_reward_character_preferences (
      discord_user_id,
      westmarches_character_id,
      character_name
    )
    VALUES ($1, $2, $3)
    ON CONFLICT (discord_user_id) DO UPDATE
    SET
      westmarches_character_id = EXCLUDED.westmarches_character_id,
      character_name = EXCLUDED.character_name,
      updated_at = NOW()
    RETURNING discord_user_id, westmarches_character_id, character_name, updated_at
    `,
    [discordUserId, characterId, characterName],
  );

  return mapScRewardCharacterPreference(result.rows[0]);
}

async function getOwnedActiveWestMarchesCharacter(discordUserId, characterId) {
  const characters = await listOwnedActiveWestMarchesCharacters(discordUserId);
  return characters.find((character) => character.id === characterId) || null;
}

async function getWestMarchesCharacter(characterId) {
  const payload = await westMarchesFetch(`/characters/${characterId}`);
  return payload.data ?? null;
}

async function approveWestMarchesCharacter(characterId) {
  const payload = await westMarchesFetch(`/characters/${characterId}/approve`, {
    method: "POST",
  });

  return payload.data ?? null;
}

async function retireWestMarchesCharacter(characterId, reason, discordUserId) {
  const payload = await westMarchesFetch(`/characters/${characterId}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "RETIRED",
      reason,
      ...(discordUserId ? { discordId: discordUserId } : {}),
    }),
  });

  return payload.data ?? null;
}

function normalizeCharacterNameSearch(value) {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, " ")
    : "";
}

async function findUnapprovedCharacterForDiscordUser(discordUserId, characterName) {
  const characters = await listOwnedActiveWestMarchesCharacters(discordUserId);
  const unapprovedCharacters = characters.filter(
    (character) => !isApprovedWestMarchesCharacter(character),
  );
  const normalizedSearch = normalizeCharacterNameSearch(characterName);

  if (!normalizedSearch) {
    return {
      status:
        unapprovedCharacters.length === 0
          ? "none"
          : unapprovedCharacters.length === 1
            ? "matched"
            : "ambiguous",
      character:
        unapprovedCharacters.length === 1 ? unapprovedCharacters[0] : null,
      candidates: unapprovedCharacters,
    };
  }

  const exactMatches = unapprovedCharacters.filter(
    (character) =>
      normalizeCharacterNameSearch(formatCharacterName(character)) ===
      normalizedSearch,
  );
  const partialMatches =
    exactMatches.length > 0
      ? exactMatches
      : unapprovedCharacters.filter((character) =>
          normalizeCharacterNameSearch(formatCharacterName(character)).includes(
            normalizedSearch,
          ),
        );

  return {
    status:
      partialMatches.length === 0
        ? "none"
        : partialMatches.length === 1
          ? "matched"
          : "ambiguous",
    character: partialMatches.length === 1 ? partialMatches[0] : null,
    candidates: partialMatches.length > 0 ? partialMatches : unapprovedCharacters,
  };
}

function formatCharacterClass(character) {
  if (typeof character?.class === "string" && character.class.trim()) {
    return character.class.trim();
  }

  const attributeValues = Array.isArray(character?.attributeValues)
    ? character.attributeValues
    : [];

  for (const attributeValue of attributeValues) {
    const attributeName =
      typeof attributeValue?.attribute?.name === "string"
        ? attributeValue.attribute.name.trim().toLowerCase()
        : "";

    if (!["class", "classes"].includes(attributeName)) {
      continue;
    }

    const valueTexts = Array.isArray(attributeValue?.valueTexts)
      ? attributeValue.valueTexts
      : [];
    const classText = valueTexts
      .map((value) => (typeof value === "string" ? value.trim() : String(value || "")))
      .filter(Boolean)
      .join(", ");

    if (classText) {
      return classText;
    }
  }

  return "Unknown class";
}

async function listOwnedCharacterSummaries(discordUserId) {
  const characters = await listOwnedActiveWestMarchesCharacters(discordUserId);
  const details = await Promise.all(
    characters.map(async (character) => {
      try {
        return (await getWestMarchesCharacter(character.id)) || character;
      } catch (error) {
        console.error(
          `Failed to load WestMarches character details for ${character.id}:`,
          error,
        );
        return character;
      }
    }),
  );

  return details.map((character, index) => {
    const fallbackCharacter = characters[index];
    return {
      id: character?.id || fallbackCharacter.id,
      name: formatCharacterName(character) || formatCharacterName(fallbackCharacter),
      className: formatCharacterClass(character),
      level:
        character?.level ?? fallbackCharacter?.level ?? "Unknown level",
    };
  });
}

function buildCharacterListEmbed({ displayName, characters }) {
  const description = characters.length
    ? characters
        .map(
          (character) =>
            `**${character.name}** - ${character.className} - Level ${character.level}`,
        )
        .join("\n")
    : "No active WestMarches.games characters were found for this Discord account.";

  return new EmbedBuilder()
    .setTitle(`${displayName}'s Characters`)
    .setDescription(truncateValue(description, 4096));
}

function buildScRewardCharacterRow(discordUserId, characters, currentCharacterId) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`sc-character:${discordUserId}`)
    .setPlaceholder("Choose your default SC character...")
    .addOptions(
      characters.slice(0, 25).map((character) => {
        const characterName = formatCharacterName(character);
        const level = normalizeCharacterLevel(character);

        return {
          label: characterName.slice(0, 100),
          description: `Level ${level || "unknown"}`.slice(0, 100),
          value: character.id,
          default: character.id === currentCharacterId,
        };
      }),
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildRetireCharacterRow(discordUserId, characters) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`retire-character:${discordUserId}`)
    .setPlaceholder("Choose the character to retire...")
    .addOptions(
      characters.slice(0, 25).map((character) => {
        const characterName = formatCharacterName(character);
        const level = normalizeCharacterLevel(character);

        return {
          label: characterName.slice(0, 100),
          description: `Level ${level || "unknown"}`.slice(0, 100),
          value: character.id,
        };
      }),
    );

  return new ActionRowBuilder().addComponents(menu);
}

async function awardScToCharacters({ awards, amount, reason }) {
  if (!config.westMarchesScCurrencyId) {
    throw new Error("missing_sc_currency_id");
  }

  if (!Array.isArray(awards) || awards.length === 0) {
    return [];
  }

  const payload = await westMarchesFetch("/rewards", {
    method: "POST",
    body: JSON.stringify({
      rewards: awards.map((award) => ({
        characterId: award.characterId,
        currencies: {
          [config.westMarchesScCurrencyId]: amount,
        },
        reason,
        discordId: award.discordUserId,
      })),
    }),
  });

  return Array.isArray(payload.data) ? payload.data : [];
}

async function awardHourlyRewardToCharacter({
  characterId,
  discordUserId,
  hours,
  level,
  reason,
}) {
  if (!config.westMarchesGoldCurrencyId) {
    throw new Error("missing_gold_currency_id");
  }

  const rewardRow = getRewardRow(level);
  const experience = Math.round(hours * rewardRow.xpPerHour);
  const gold = Math.round(hours * rewardRow.goldPerHour);

  const payload = await westMarchesFetch("/rewards", {
    method: "POST",
    body: JSON.stringify({
      rewards: [
        {
          characterId,
          experience,
          currencies: {
            [config.westMarchesGoldCurrencyId]: gold,
          },
          reason,
          discordId: discordUserId,
        },
      ],
    }),
  });

  return {
    experience,
    gold,
    reward: Array.isArray(payload.data) ? (payload.data[0] ?? null) : null,
  };
}

async function grantWestMarchesItem({
  characterId,
  itemName,
  quantity = 1,
  isConsumable = false,
  reason,
  discordUserId,
}) {
  const payload = await westMarchesFetch(`/characters/${characterId}/rewards`, {
    method: "POST",
    body: JSON.stringify({
      items: [{ name: itemName, quantity, isConsumable }],
      reason,
      ...(discordUserId ? { discordId: discordUserId } : {}),
    }),
  });

  return payload.data ?? null;
}

module.exports = {
  awardHourlyRewardToCharacter,
  awardScToCharacters,
  approveWestMarchesCharacter,
  buildCharacterListEmbed,
  buildRetireCharacterRow,
  buildScRewardCharacterRow,
  formatCharacterClass,
  formatCharacterName,
  getOwnedActiveWestMarchesCharacter,
  getScRewardCharacterPreference,
  getWestMarchesCharacter,
  grantWestMarchesItem,
  isWestMarchesConfigured,
  findUnapprovedCharacterForDiscordUser,
  listAllWestMarchesCharacters,
  listHighestLevelActiveCharactersForDiscordUsers,
  listOwnedActiveWestMarchesCharacters,
  listOwnedCharacterSummaries,
  normalizeCharacterLevel,
  normalizeCharacterNameSearch,
  retireWestMarchesCharacter,
  upsertScRewardCharacterPreference,
};
