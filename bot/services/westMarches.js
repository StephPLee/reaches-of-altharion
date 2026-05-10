const { EmbedBuilder } = require("discord.js");
const config = require("../config");
const { truncateValue } = require("../utils");

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
      const character = highestByDiscordUserId.get(discordUserId);
      return character
        ? {
            discordUserId,
            characterId: character.id,
            characterName: formatCharacterName(character),
            level: normalizeCharacterLevel(character),
          }
        : null;
    })
    .filter(Boolean);

  return {
    matched,
    missingUserIds: discordUserIds.filter(
      (discordUserId) => !highestByDiscordUserId.has(discordUserId),
    ),
  };
}

async function getOwnedActiveWestMarchesCharacter(discordUserId, characterId) {
  const characters = await listOwnedActiveWestMarchesCharacters(discordUserId);
  return characters.find((character) => character.id === characterId) || null;
}

async function getWestMarchesCharacter(characterId) {
  const payload = await westMarchesFetch(`/characters/${characterId}`);
  return payload.data ?? null;
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

module.exports = {
  awardScToCharacters,
  buildCharacterListEmbed,
  formatCharacterClass,
  formatCharacterName,
  getOwnedActiveWestMarchesCharacter,
  getWestMarchesCharacter,
  isWestMarchesConfigured,
  listAllWestMarchesCharacters,
  listHighestLevelActiveCharactersForDiscordUsers,
  listOwnedActiveWestMarchesCharacters,
  listOwnedCharacterSummaries,
};
