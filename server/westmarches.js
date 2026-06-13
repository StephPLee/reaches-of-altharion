const {
  westMarchesApiBaseUrl,
  westMarchesApiKey,
  westMarchesEventCurrencyName,
} = require("./config");
const ATTRIBUTE_STATS_CACHE_TTL_MS = 5 * 60 * 1000;
const CHARACTER_DETAIL_BATCH_SIZE = 10;
const CLASS_ATTRIBUTE_NAME = "class";
const CHARACTER_LEVEL_MIN = 1;
const CHARACTER_LEVEL_MAX = 20;
const CLASS_ATTRIBUTE_OPTIONS = [
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard",
  "Artificer",
  "Gunslinger",
  "Monster Hunter",
  "Illrigger",
  "Blood Hunter",
];
let attributeStatsCache = {
  expiresAt: 0,
  value: null,
};
let activeCharacterDetailsCache = {
  expiresAt: 0,
  value: null,
};
let eventCurrencyCache = {
  expiresAt: 0,
  value: null,
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractAttributeOptions(attributeName, optionValue) {
  if (attributeName.trim().toLowerCase() !== CLASS_ATTRIBUTE_NAME) {
    return [optionValue];
  }

  const normalizedValue = optionValue.trim();
  if (!normalizedValue) {
    return [];
  }

  const matches = CLASS_ATTRIBUTE_OPTIONS.filter((className) =>
    new RegExp(`\\b${escapeRegExp(className)}\\b`, "i").test(normalizedValue),
  );

  return [...new Set(matches)];
}

function normalizeAttributeName(attributeName) {
  return typeof attributeName === "string"
    ? attributeName.trim().toLowerCase()
    : "";
}

function normalizeCharacterLevel(character) {
  const rawLevel = character?.level;
  const level =
    typeof rawLevel === "number" ? rawLevel : Number.parseInt(rawLevel, 10);

  return Number.isInteger(level) &&
    level >= CHARACTER_LEVEL_MIN &&
    level <= CHARACTER_LEVEL_MAX
    ? level
    : null;
}

function isWestMarchesConfigured() {
  return Boolean(westMarchesApiBaseUrl && westMarchesApiKey);
}

async function westMarchesFetch(path, init = {}) {
  if (!isWestMarchesConfigured()) {
    throw new Error("West Marches API is not configured.");
  }

  const response = await fetch(`${westMarchesApiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${westMarchesApiKey}`,
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

async function listAllCharacters() {
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

async function listCurrencies() {
  const payload = await westMarchesFetch("/currencies");
  return Array.isArray(payload.data) ? payload.data : [];
}

async function listRecentAdventures({ pageSize = 25 } = {}) {
  const safePageSize =
    Number.isInteger(pageSize) && pageSize > 0 && pageSize <= 100
      ? pageSize
      : 25;
  const payload = await westMarchesFetch(
    `/adventures?page=1&pageSize=${safePageSize}`,
  );
  return Array.isArray(payload.data) ? payload.data : [];
}

async function listMarketplaces() {
  const payload = await westMarchesFetch("/marketplaces");
  return Array.isArray(payload.data) ? payload.data : [];
}

async function getEventCurrencyMapping() {
  const currencyName =
    typeof westMarchesEventCurrencyName === "string"
      ? westMarchesEventCurrencyName.trim()
      : "";

  if (!currencyName) {
    return null;
  }

  const now = Date.now();
  if (eventCurrencyCache.value && eventCurrencyCache.expiresAt > now) {
    return eventCurrencyCache.value;
  }

  const currencies = await listCurrencies();
  const match =
    currencies.find(
      (currency) =>
        typeof currency?.name === "string" &&
        currency.name.trim().localeCompare(currencyName, undefined, {
          sensitivity: "accent",
        }) === 0,
    ) || null;

  eventCurrencyCache = {
    value: match
      ? {
          id: match.id,
          name: match.name.trim(),
        }
      : null,
    expiresAt: now + ATTRIBUTE_STATS_CACHE_TTL_MS,
  };

  return eventCurrencyCache.value;
}

async function getCharacter(characterId) {
  const payload = await westMarchesFetch(`/characters/${characterId}`);
  return payload.data ?? null;
}

async function listActiveCharacterDetails() {
  const now = Date.now();
  if (
    activeCharacterDetailsCache.value &&
    activeCharacterDetailsCache.expiresAt > now
  ) {
    return activeCharacterDetailsCache.value;
  }

  const characters = await listAllCharacters();
  const activeCharacters = characters.filter(
    (character) =>
      typeof character?.status !== "string" ||
      character.status.toUpperCase() !== "RETIRED",
  );

  const details = [];

  for (
    let startIndex = 0;
    startIndex < activeCharacters.length;
    startIndex += CHARACTER_DETAIL_BATCH_SIZE
  ) {
    const batch = activeCharacters.slice(
      startIndex,
      startIndex + CHARACTER_DETAIL_BATCH_SIZE,
    );
    const batchDetails = await Promise.all(
      batch.map((character) => getCharacter(character.id)),
    );
    details.push(...batchDetails.filter(Boolean));
  }

  const result = {
    activeCharacters,
    details,
  };

  activeCharacterDetailsCache = {
    value: result,
    expiresAt: now + ATTRIBUTE_STATS_CACHE_TTL_MS,
  };

  return result;
}

async function listCharacterAttributeStats() {
  const now = Date.now();
  if (attributeStatsCache.value && attributeStatsCache.expiresAt > now) {
    return attributeStatsCache.value;
  }

  const { activeCharacters, details } = await listActiveCharacterDetails();
  const attributeCounts = new Map();
  const levelCounts = new Map(
    Array.from(
      { length: CHARACTER_LEVEL_MAX - CHARACTER_LEVEL_MIN + 1 },
      (_value, index) => [CHARACTER_LEVEL_MIN + index, 0],
    ),
  );

  for (const character of activeCharacters) {
    const level = normalizeCharacterLevel(character);
    if (level !== null) {
      levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
    }
  }

  for (const character of details) {
    const attributeValues = Array.isArray(character?.attributeValues)
      ? character.attributeValues
      : [];

    for (const attributeValue of attributeValues) {
      const attributeName =
        typeof attributeValue?.attribute?.name === "string"
          ? attributeValue.attribute.name.trim()
          : "";

      if (!attributeName) {
        continue;
      }

      if (!attributeCounts.has(attributeName)) {
        attributeCounts.set(attributeName, {
          attributeName,
          totalSelections: 0,
          options: new Map(),
        });
      }

      const aggregate = attributeCounts.get(attributeName);
      const valueTexts = Array.isArray(attributeValue?.valueTexts)
        ? attributeValue.valueTexts
        : [];

      for (const rawValue of valueTexts) {
        const optionValue =
          typeof rawValue === "string"
            ? rawValue.trim()
            : String(rawValue || "");

        if (!optionValue) {
          continue;
        }

        for (const extractedValue of extractAttributeOptions(
          attributeName,
          optionValue,
        )) {
          aggregate.totalSelections += 1;
          aggregate.options.set(
            extractedValue,
            (aggregate.options.get(extractedValue) || 0) + 1,
          );
        }
      }
    }
  }

  const result = {
    totalCharacters: activeCharacters.length,
    levels: [...levelCounts.entries()].map(([level, count]) => ({
      level,
      count,
      percentage:
        activeCharacters.length > 0
          ? Number(((count / activeCharacters.length) * 100).toFixed(1))
          : 0,
    })),
    attributes: [...attributeCounts.values()]
      .map((attribute) => ({
        attributeName: attribute.attributeName,
        totalSelections: attribute.totalSelections,
        options: [...attribute.options.entries()]
          .map(([value, count]) => ({
            value,
            count,
            percentage:
              attribute.totalSelections > 0
                ? Number(((count / attribute.totalSelections) * 100).toFixed(1))
                : 0,
          }))
          .sort(
            (left, right) =>
              right.count - left.count || left.value.localeCompare(right.value),
          ),
      }))
      .sort(
        (left, right) =>
          right.totalSelections - left.totalSelections ||
          left.attributeName.localeCompare(right.attributeName),
      ),
  };

  attributeStatsCache = {
    value: result,
    expiresAt: now + ATTRIBUTE_STATS_CACHE_TTL_MS,
  };

  return result;
}

async function distributeRewards({ rewards, adventureId = "" }) {
  const payload = await westMarchesFetch("/rewards", {
    method: "POST",
    body: JSON.stringify({
      rewards,
      ...(adventureId ? { adventureId } : {}),
    }),
  });

  return Array.isArray(payload.data) ? payload.data : [];
}

module.exports = {
  distributeRewards,
  getCharacter,
  isWestMarchesConfigured,
  listAllCharacters,
  listCharacterAttributeStats,
  listCurrencies,
  listMarketplaces,
  listRecentAdventures,
  getEventCurrencyMapping,
};
