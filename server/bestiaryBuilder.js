const BESTIARY_BUILDER_BASE_URL = "https://bestiarybuilder.com";

const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

const SKILL_IDS = {
  acrobatics: "acrobatics",
  "animal handling": "animal-handling",
  arcana: "arcana",
  athletics: "athletics",
  deception: "deception",
  history: "history",
  insight: "insight",
  intimidation: "intimidation",
  investigation: "investigation",
  medicine: "medicine",
  nature: "nature",
  perception: "perception",
  performance: "performance",
  persuasion: "persuasion",
  religion: "religion",
  "sleight of hand": "sleight-of-hand",
  stealth: "stealth",
  survival: "survival",
};

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function extractBestiaryBuilderId(input) {
  const value = String(input || "").trim();
  if (/^[a-f0-9]{24}$/i.test(value)) return value;

  const pathMatch = value.match(/\/bestiary-viewer\/([a-f0-9]{24})/i);
  if (pathMatch) return pathMatch[1];

  try {
    const url = new URL(value);
    const id = url.searchParams.get("id") || url.searchParams.get("bestiary");
    if (id && /^[a-f0-9]{24}$/i.test(id)) return id;
  } catch {
    // Ignore invalid URL input; the caller reports a clean validation message.
  }

  return null;
}

async function fetchBestiaryBuilderJson(path) {
  const response = await fetch(`${BESTIARY_BUILDER_BASE_URL}${path}`, {
    headers: {
      accept: "application/json",
      "user-agent": "ReachesOfAltharion/1.0",
    },
  });

  if (!response.ok) {
    throw createHttpError(
      response.status,
      `Bestiary Builder returned ${response.status}.`,
    );
  }

  return response.json();
}

function abilityMod(score) {
  return Math.floor((Number(score) - 10) / 2);
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeProficiency(value) {
  if (!value) return "none";
  if (value.isExpertise) return "expertise";
  if (value.isProficient) return "proficient";
  if (value.isHalfProficient) return "half";
  return "none";
}

function calculateHp(stats) {
  const hp = stats?.defenses?.hp;
  const override = numberOrNull(hp?.override);
  if (override != null) return override;

  const diceCount = numberOrNull(hp?.numOfHitDie);
  const dieSize = numberOrNull(hp?.sizeOfHitDie);
  if (!diceCount || !dieSize) return null;

  const con = numberOrNull(stats?.abilities?.stats?.con) ?? 10;
  return Math.max(
    1,
    Math.floor(diceCount * ((dieSize + 1) / 2) + diceCount * abilityMod(con)),
  );
}

function normalizeSpeed(core) {
  const speeds = Array.isArray(core?.speed) ? core.speed : [];
  const walk = speeds.find((speed) => String(speed?.name).toLowerCase() === "walk");
  return numberOrNull(walk?.value ?? speeds[0]?.value);
}

function extractAutomationDamage(value, output = []) {
  if (!value || typeof value !== "object") return output;

  if (
    String(value.type || "").toLowerCase() === "damage" &&
    typeof value.damage === "string" &&
    value.damage.trim()
  ) {
    const damageType = typeof value.damageType === "string" ? value.damageType : "";
    output.push(
      damageType.trim()
        ? `${value.damage.trim()}[${damageType.trim().toLowerCase()}]`
        : value.damage.trim(),
    );
  }

  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      child.forEach((entry) => extractAutomationDamage(entry, output));
    } else if (child && typeof child === "object") {
      extractAutomationDamage(child, output);
    }
  }

  return output;
}

function firstDescriptionLine(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 130);
}

function normalizeFeatures(stats) {
  const groups = [
    ["Action", stats?.features?.actions],
    ["Bonus action", stats?.features?.bonus],
    ["Reaction", stats?.features?.reactions],
    ["Legendary", stats?.features?.legendary],
    ["Mythic", stats?.features?.mythic],
    ["Lair", stats?.features?.lair],
  ];

  const attacks = [];
  for (const [source, features] of groups) {
    if (!Array.isArray(features)) continue;
    for (const feature of features) {
      const name = String(feature?.name || "").trim();
      if (!name) continue;

      const damage = [
        ...new Set(extractAutomationDamage(feature?.automation).filter(Boolean)),
      ].join(" + ");
      const description = firstDescriptionLine(feature?.description);

      attacks.push({
        id: `${source}:${name}`,
        name,
        source,
        damage: damage || undefined,
        sub: damage || description || source,
      });
    }
  }

  return attacks;
}

function spellNameFromEntry(entry) {
  if (typeof entry === "string") return entry.trim();
  if (entry && typeof entry.spell === "string") return entry.spell.trim();
  if (entry && typeof entry.name === "string") return entry.name.trim();
  return "";
}

function normalizeSpells(stats) {
  const spells = [];
  const seen = new Set();
  const innate = stats?.spellcasting?.innateSpells?.spellList;

  if (innate && typeof innate === "object") {
    for (const [uses, entries] of Object.entries(innate)) {
      const list = Array.isArray(entries) ? entries : [];
      for (const entry of list) {
        const name = spellNameFromEntry(entry);
        if (!name) continue;
        const key = `innate:${uses}:${name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        spells.push({
          id: key,
          name,
          level: 0,
          prepared: true,
          sub: uses === "0" ? "Innate - at will" : `Innate - ${uses}/day`,
        });
      }
    }
  }

  const caster = stats?.spellcasting?.casterSpells?.spellList;
  if (Array.isArray(caster)) {
    caster.forEach((entries, level) => {
      const list = Array.isArray(entries) ? entries : [];
      for (const entry of list) {
        const name = spellNameFromEntry(entry);
        if (!name) continue;
        const key = `caster:${level}:${name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        spells.push({
          id: key,
          name,
          level,
          prepared: true,
          sub: level === 0 ? "Cantrip" : `Level ${level}`,
        });
      }
    });
  }

  return spells.sort((left, right) => left.level - right.level || left.name.localeCompare(right.name));
}

function normalizeBestiaryBuilderCreature(row, sourceUrl, bestiary) {
  const stats = row?.stats || {};
  const description = stats.description || {};
  const core = stats.core || {};
  const abilities = ABILITIES.reduce((acc, ability) => {
    const score = numberOrNull(stats?.abilities?.stats?.[ability]);
    if (score != null) acc[ability] = score;
    return acc;
  }, {});
  const proficiencyBonus = numberOrNull(core.proficiencyBonus) ?? 2;
  const hpMax = calculateHp(stats);
  const ac = numberOrNull(stats?.defenses?.ac?.ac);
  const speed = normalizeSpeed(core);
  const challengeRating = description.cr ?? null;
  const creatureId = row?.id || description.name || cryptoRandomId();
  const name = String(description.name || "Bestiary Creature").trim();
  const race = String(core.race || "").trim();
  const size = String(core.size || "").trim();
  const ancestry = [size, race].filter(Boolean).join(" ");

  const savingThrows = {};
  for (const ability of ABILITIES) {
    savingThrows[ability] = normalizeProficiency(stats?.abilities?.saves?.[ability]);
  }

  const skills = {};
  for (const skill of Array.isArray(stats?.abilities?.skills)
    ? stats.abilities.skills
    : []) {
    const id = SKILL_IDS[String(skill?.skillName || "").trim().toLowerCase()];
    if (id) skills[id] = normalizeProficiency(skill);
  }

  return {
    id: `bb:${creatureId}`,
    sourceKind: "bestiary-builder",
    sourceUrl,
    sourceBestiaryId: row?.bestiaryId || bestiary?.id || null,
    sourceBestiaryName: bestiary?.name || null,
    sourceCreatureId: row?.id || null,
    syncedAt: new Date().toISOString(),
    avatarUrl: description.image || null,
    name,
    ancestry,
    level: null,
    challengeRating,
    classes: [
      {
        name: race || "Creature",
        subclass: challengeRating != null ? `CR ${challengeRating}` : "Creature",
        level: 0,
      },
    ],
    abilities,
    hp: hpMax != null ? { max: hpMax, current: hpMax, temp: 0 } : undefined,
    ac: ac ?? undefined,
    speed: speed ?? undefined,
    initiative:
      abilities.dex != null ? abilityMod(abilities.dex) : undefined,
    proficiencyBonus,
    savingThrows,
    skills,
    attacks: normalizeFeatures(stats),
    spells: normalizeSpells(stats),
    statBlock: {
      size,
      type: race,
      alignment: description.alignment || "",
      cr: challengeRating,
      xp: description.xp ?? null,
    },
  };
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2);
}

async function fetchBestiaryBuilderBestiary(input) {
  const bestiaryId = extractBestiaryBuilderId(input);
  if (!bestiaryId) {
    throw createHttpError(
      400,
      "Bestiary Builder share link or bestiary id is required.",
    );
  }

  const sourceUrl = `${BESTIARY_BUILDER_BASE_URL}/bestiary-viewer/${bestiaryId}`;
  const [bestiary, creaturesPayload] = await Promise.all([
    fetchBestiaryBuilderJson(`/api/bestiary/${bestiaryId}`),
    fetchBestiaryBuilderJson(`/api/bestiary/${bestiaryId}/creatures`),
  ]);

  const rawCreatures = Array.isArray(creaturesPayload)
    ? creaturesPayload
    : Array.isArray(creaturesPayload?.data)
      ? creaturesPayload.data
      : [];

  return {
    bestiary: {
      id: bestiary?.id || bestiaryId,
      name: bestiary?.name || "Bestiary",
      description: bestiary?.description || "",
      sourceUrl,
    },
    creatures: rawCreatures.map((creature) =>
      normalizeBestiaryBuilderCreature(creature, sourceUrl, bestiary),
    ),
  };
}

module.exports = {
  extractBestiaryBuilderId,
  fetchBestiaryBuilderBestiary,
  normalizeBestiaryBuilderCreature,
};
