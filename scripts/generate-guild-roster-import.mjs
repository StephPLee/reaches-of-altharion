import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(repoRoot, ".env") });
dotenv.config({ path: path.join(repoRoot, "server", ".env") });
dotenv.config({ path: path.join(repoRoot, "bot", ".env") });

const defaultCsvPath = path.join(
  process.env.USERPROFILE || "",
  "Downloads",
  "guild rosters.csv",
);
const csvPath = process.argv[2] || defaultCsvPath;
const outputSqlPath =
  process.argv[3] ||
  path.join(repoRoot, "sql", "018_import_existing_guild_rosters.sql");
const reportPath =
  process.argv[4] ||
  path.join(repoRoot, "sql", "018_import_existing_guild_rosters.report.md");

const westMarchesApiBaseUrl = (
  process.env.WEST_MARCHES_API_BASE_URL ||
  "https://www.westmarches.games/api/v1"
).replace(/\/$/, "");
const westMarchesApiKey = process.env.WEST_MARCHES_API_KEY || "";

if (!westMarchesApiKey) {
  throw new Error("WEST_MARCHES_API_KEY is required.");
}

const manualCharacterNameOverrides = new Map([
  ["franscisca", "Francisca Chiara"],
  ["aeven", "Kelyarus"],
  ["welt yang", "Welt"],
]);

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseCsv(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const [headerLine, ...dataLines] = lines;
  const headers = parseCsvLine(headerLine).map((header) => header.trim());

  return dataLines
    .map((line) => {
      const values = parseCsvLine(line);
      return Object.fromEntries(
        headers.map((header, index) => [header, values[index]?.trim() || ""]),
      );
    })
    .filter(
      (row) => row["Card Name"] && row["List Name"] && row.Description,
    );
}

function normalizeName(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function nameContainsPhrase(characterName, csvName) {
  const normalizedCharacterName = normalizeName(characterName);
  const normalizedCsvName = normalizeName(csvName);
  return new RegExp(
    `(^|[^a-z0-9])${escapeRegExp(normalizedCsvName)}([^a-z0-9]|$)`,
    "i",
  ).test(normalizedCharacterName);
}

function sqlString(value) {
  return `$$${value.replace(/\$\$/g, "$ $")}$$`;
}

async function westMarchesFetch(apiPath) {
  const response = await fetch(`${westMarchesApiBaseUrl}${apiPath}`, {
    headers: {
      Authorization: `Bearer ${westMarchesApiKey}`,
      Accept: "application/json",
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof payload?.error === "string" && payload.error
        ? payload.error
        : `West Marches request failed (${response.status}).`;
    throw new Error(message);
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
    characters.push(...(Array.isArray(payload.data) ? payload.data : []));

    totalPages =
      typeof payload?.pagination?.totalPages === "number" &&
      payload.pagination.totalPages > 0
        ? payload.pagination.totalPages
        : 1;
    page += 1;
  }

  return characters;
}

function isActiveCharacter(character) {
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

function buildCharacterLookup(characters) {
  const exactLookup = new Map();
  const charactersByDiscordId = new Map();
  const exactNameLookup = new Map();
  const activeCharacters = [];

  for (const character of characters) {
    if (!isActiveCharacter(character)) {
      continue;
    }

    const discordId = character?.user?.discordId;
    const characterName =
      typeof character?.name === "string" ? character.name.trim() : "";

    if (!discordId || !characterName || typeof character?.id !== "string") {
      continue;
    }

    activeCharacters.push(character);

    const key = `${discordId}:${normalizeName(characterName)}`;
    const exactCurrent = exactLookup.get(key) || [];
    exactCurrent.push(character);
    exactLookup.set(key, exactCurrent);

    const discordCurrent = charactersByDiscordId.get(discordId) || [];
    discordCurrent.push(character);
    charactersByDiscordId.set(discordId, discordCurrent);

    const normalizedCharacterName = normalizeName(characterName);
    const nameCurrent = exactNameLookup.get(normalizedCharacterName) || [];
    nameCurrent.push(character);
    exactNameLookup.set(normalizedCharacterName, nameCurrent);
  }

  return {
    exactLookup,
    charactersByDiscordId,
    exactNameLookup,
    activeCharacters,
  };
}

function createImportSql(matches) {
  if (matches.length === 0) {
    return `-- No roster rows matched WestMarches.games characters.
-- Check sql/018_import_existing_guild_rosters.report.md before importing.
`;
  }

  const values = matches
    .map(
      (match) =>
        `    (${sqlString(match.characterName)},${sqlString(match.guildName)},${sqlString(match.importDiscordUserId || match.discordUserId)},${sqlString(match.westMarchesCharacterId)})`,
    )
    .join(",\n");

  return `WITH source_rosters(character_name, guild_name, discord_user_id, westmarches_character_id) AS (
  VALUES
${values}
),
resolved_rosters AS (
  SELECT
    g.id AS guild_id,
    source_rosters.character_name,
    source_rosters.discord_user_id,
    source_rosters.westmarches_character_id
  FROM source_rosters
  JOIN guilds g
    ON LOWER(g.name) = LOWER(source_rosters.guild_name)
)
INSERT INTO guild_roster_memberships (
  guild_id,
  westmarches_character_id,
  character_name,
  discord_user_id
)
SELECT
  resolved_rosters.guild_id,
  resolved_rosters.westmarches_character_id,
  resolved_rosters.character_name,
  resolved_rosters.discord_user_id
FROM resolved_rosters
ON CONFLICT (westmarches_character_id) DO UPDATE
SET
  guild_id = EXCLUDED.guild_id,
  character_name = EXCLUDED.character_name,
  discord_user_id = EXCLUDED.discord_user_id,
  updated_at = NOW();
`;
}

function createReport({ matches, unmatched, ambiguous }) {
  const lines = [
    "# Existing Guild Roster Import Report",
    "",
    `Matched rows: ${matches.length}`,
    `Exact matches: ${matches.filter((match) => match.matchType === "exact").length}`,
    `Partial matches: ${matches.filter((match) => match.matchType === "partial").length}`,
    `Corrected Discord ID matches: ${matches.filter((match) => match.matchType.startsWith("corrected-discord")).length}`,
    `Unmatched rows: ${unmatched.length}`,
    `Ambiguous rows: ${ambiguous.length}`,
    "",
  ];

  const partialMatches = matches.filter(
    (match) => match.matchType === "partial",
  );
  if (partialMatches.length > 0) {
    lines.push("## Partial Matches", "");
    for (const match of partialMatches) {
      lines.push(
        `- ${match.characterName} -> ${match.westMarchesCharacterName} / ${match.guildName} / ${match.discordUserId}`,
      );
    }
    lines.push("");
  }

  const correctedDiscordMatches = matches.filter((match) =>
    match.matchType.startsWith("corrected-discord"),
  );
  if (correctedDiscordMatches.length > 0) {
    lines.push("## Corrected Discord ID Matches", "");
    for (const match of correctedDiscordMatches) {
      lines.push(
        `- ${match.characterName} -> ${match.westMarchesCharacterName} / ${match.guildName} / CSV ${match.discordUserId} -> WestMarches ${match.importDiscordUserId}`,
      );
    }
    lines.push("");
  }

  if (unmatched.length > 0) {
    lines.push("## Unmatched", "");
    for (const row of unmatched) {
      lines.push(
        `- ${row.characterName} / ${row.guildName} / ${row.discordUserId}`,
      );
    }
    lines.push("");
  }

  if (ambiguous.length > 0) {
    lines.push("## Ambiguous", "");
    for (const row of ambiguous) {
      lines.push(
        `- ${row.characterName} / ${row.guildName} / ${row.discordUserId}: ${row.candidates
          .map((candidate) => `${candidate.name} (${candidate.id})`)
          .join(", ")}`,
      );
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

const csvRows = parseCsv(fs.readFileSync(csvPath, "utf8")).map((row) => ({
  characterName: row["Card Name"],
  guildName: row["List Name"],
  discordUserId: row.Description,
}));
const characters = await listAllCharacters();
const {
  exactLookup,
  charactersByDiscordId,
  exactNameLookup,
  activeCharacters,
} = buildCharacterLookup(characters);
const matches = [];
const unmatched = [];
const ambiguous = [];

for (const row of csvRows) {
  const matchCharacterName =
    manualCharacterNameOverrides.get(normalizeName(row.characterName)) ||
    row.characterName;
  const normalizedCsvName = normalizeName(matchCharacterName);
  const key = `${row.discordUserId}:${normalizedCsvName}`;
  let candidates = exactLookup.get(key) || [];
  let matchType = "exact";

  if (candidates.length === 0) {
    matchType = "partial";
    candidates = (charactersByDiscordId.get(row.discordUserId) || []).filter(
      (character) => nameContainsPhrase(character.name, matchCharacterName),
    );
  }

  if (candidates.length === 0) {
    matchType = "corrected-discord-exact";
    candidates = exactNameLookup.get(normalizedCsvName) || [];
  }

  if (candidates.length === 0) {
    matchType = "corrected-discord-partial";
    candidates = activeCharacters.filter((character) =>
      nameContainsPhrase(character.name, matchCharacterName),
    );
  }

  if (candidates.length === 1) {
    matches.push({
      ...row,
      westMarchesCharacterId: candidates[0].id,
      westMarchesCharacterName: candidates[0].name,
      importDiscordUserId: candidates[0]?.user?.discordId || row.discordUserId,
      matchType,
    });
    continue;
  }

  if (candidates.length > 1) {
    ambiguous.push({ ...row, candidates });
    continue;
  }

  unmatched.push(row);
}

fs.writeFileSync(outputSqlPath, createImportSql(matches));
fs.writeFileSync(reportPath, createReport({ matches, unmatched, ambiguous }));

console.log(`Wrote ${matches.length} matched roster rows to ${outputSqlPath}`);
console.log(`Wrote import report to ${reportPath}`);
if (unmatched.length > 0 || ambiguous.length > 0) {
  process.exitCode = 2;
}
