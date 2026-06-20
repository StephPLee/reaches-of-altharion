const DICECLOUD_WEBSOCKET_URL = "wss://v1.dicecloud.com/websocket";
const DICECLOUD_CHARACTER_BASE_URL = "https://v1.dicecloud.com/character";
const WebSocketClient =
  typeof WebSocket === "function" ? WebSocket : require("ws");

const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];
const DICECLOUD_ABILITY_STATS = {
  str: "strength",
  dex: "dexterity",
  con: "constitution",
  int: "intelligence",
  wis: "wisdom",
  cha: "charisma",
};
const ABILITY_FROM_DICECLOUD = Object.fromEntries(
  Object.entries(DICECLOUD_ABILITY_STATS).map(([key, value]) => [value, key]),
);

const SAVE_STATS = {
  str: "strengthSave",
  dex: "dexteritySave",
  con: "constitutionSave",
  int: "intelligenceSave",
  wis: "wisdomSave",
  cha: "charismaSave",
};

const SKILL_STATS = {
  acrobatics: "acrobatics",
  animalHandling: "animalHandling",
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
  sleightOfHand: "sleightOfHand",
  stealth: "stealth",
  survival: "survival",
};

function normalizeName(value) {
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value) {
  return normalizeName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function abilityMod(score) {
  return Math.floor(((Number(score) || 10) - 10) / 2);
}

function extractDicecloudCharacterId(input) {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value) return null;

  const directId = value.match(/^[A-Za-z0-9]{12,}$/);
  if (directId) return directId[0];

  const urlId = value.match(/dicecloud\.com\/character\/([^/?#]+)/i);
  return urlId?.[1] || null;
}

function createSourceUrl(characterId, character) {
  const urlName = normalizeName(character?.urlName);
  return `${DICECLOUD_CHARACTER_BASE_URL}/${characterId}${urlName ? `/${encodeURIComponent(urlName)}` : ""}`;
}

function subscribeDicecloudCharacter(characterId) {
  return new Promise((resolve, reject) => {
    const collections = {};
    let settled = false;
    const ws = new WebSocketClient(DICECLOUD_WEBSOCKET_URL);
    const timeout = setTimeout(() => {
      finish(new Error("Dicecloud did not return the character before the request timed out."));
    }, 15000);

    function finish(error, result) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try {
        ws.close();
      } catch {}
      if (error) reject(error);
      else resolve(result);
    }

    const handleOpen = () => {
      ws.send(JSON.stringify({
        msg: "connect",
        version: "1",
        support: ["1"],
      }));
    };

    const handleMessage = (eventOrData) => {
      const rawData = eventOrData?.data ?? eventOrData;
      const message = JSON.parse(rawData.toString());
      if (message.msg === "connected") {
        ws.send(JSON.stringify({
          msg: "sub",
          id: "character",
          name: "singleCharacter",
          params: [characterId],
        }));
        return;
      }

      if (message.msg === "added") {
        (collections[message.collection] ||= []).push({
          id: message.id,
          ...(message.fields || {}),
        });
        return;
      }

      if (message.msg === "nosub") {
        const error = new Error(message.error?.reason || "Dicecloud could not load that character.");
        error.statusCode = message.error?.error === 404 ? 404 : 502;
        finish(error);
        return;
      }

      if (message.msg === "ready") {
        finish(null, collections);
      }
    };

    const handleError = () => {
      const error = new Error("Dicecloud is not returning character data right now.");
      error.statusCode = 502;
      finish(error);
    };

    if (typeof ws.on === "function") {
      ws.on("open", handleOpen);
      ws.on("message", handleMessage);
      ws.on("error", handleError);
    } else {
      ws.onopen = handleOpen;
      ws.onmessage = handleMessage;
      ws.onerror = handleError;
    }
  });
}

function valueForEffect(effect, context) {
  if (Number.isFinite(Number(effect.value))) return Number(effect.value);
  const calculation = normalizeName(effect.calculation);
  if (!calculation) return 0;
  return evaluateDicecloudFormula(calculation, context);
}

function evaluateDicecloudFormula(formula, context) {
  if (!/^[A-Za-z0-9_+\-*/().\s]+$/.test(formula)) return 0;
  const expression = formula.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (name) => {
    if (name === "floor") return "Math.floor";
    if (Object.prototype.hasOwnProperty.call(context, name)) {
      return String(Number(context[name]) || 0);
    }
    return "0";
  });

  try {
    const result = Function(`"use strict"; return (${expression});`)();
    return Number.isFinite(Number(result)) ? Number(result) : 0;
  } catch {
    return 0;
  }
}

function applyEffects(effects, context) {
  const bases = {};
  const additions = {};
  for (const effect of effects) {
    if (effect.enabled === false) continue;
    const stat = normalizeName(effect.stat);
    if (!stat) continue;
    const value = valueForEffect(effect, context);
    if (!Number.isFinite(value)) continue;

    if (effect.operation === "base") {
      bases[stat] = Math.max(Number(bases[stat] ?? Number.NEGATIVE_INFINITY), value);
    } else if (effect.operation === "add") {
      additions[stat] = Number(additions[stat] || 0) + value;
    }
  }

  const result = {};
  for (const stat of new Set([...Object.keys(bases), ...Object.keys(additions)])) {
    result[stat] =
      (Number.isFinite(Number(bases[stat])) ? Number(bases[stat]) : 0) +
      Number(additions[stat] || 0);
  }
  return result;
}

function mapClasses(classes) {
  return (classes || [])
    .map((entry) => ({
      name: normalizeName(entry.name),
      subclass: normalizeName(entry.subclass || entry.subclassName) || undefined,
      level: Number(entry.level) || 0,
    }))
    .filter((entry) => entry.name);
}

function buildFormulaContext(classes, stats) {
  const context = {
    level: classes.reduce((sum, entry) => sum + entry.level, 0),
    proficiencyBonus: Math.floor((Math.max(classes.reduce((sum, entry) => sum + entry.level, 0), 1) - 1) / 4) + 2,
  };

  for (const [shortKey, longKey] of Object.entries(DICECLOUD_ABILITY_STATS)) {
    const score = Number(stats[longKey] || 10);
    context[longKey] = score;
    context[`${longKey}Mod`] = abilityMod(score);
    context[`${shortKey}Mod`] = abilityMod(score);
  }
  context.dexterityArmor = Math.max(0, context.dexterityMod || 0);

  for (const classEntry of classes) {
    const cleanName = normalizeName(classEntry.name).replace(/[^A-Za-z0-9]/g, "");
    if (cleanName) context[`${cleanName}Level`] = Number(classEntry.level) || 0;
  }

  return context;
}

function computeStats(collections) {
  const classes = mapClasses(collections.classes);
  const abilityBaseEffects = (collections.effects || []).filter((effect) =>
    Object.values(DICECLOUD_ABILITY_STATS).includes(effect.stat),
  );
  const baseStats = applyEffects(abilityBaseEffects, {});
  const firstContext = buildFormulaContext(classes, baseStats);
  const allStats = applyEffects(collections.effects || [], firstContext);
  const context = buildFormulaContext(classes, allStats);
  return {
    classes,
    context,
    stats: applyEffects(collections.effects || [], context),
  };
}

function mapAbilities(stats) {
  return Object.fromEntries(
    ABILITIES.map((ability) => [
      ability,
      Number(stats[DICECLOUD_ABILITY_STATS[ability]] || 10),
    ]),
  );
}

function mapProficiency(proficiencies, keys) {
  const result = Object.fromEntries(Object.keys(keys).map((key) => [key, "none"]));
  for (const proficiency of proficiencies || []) {
    if (proficiency.enabled === false) continue;
    const matchingKey = Object.entries(keys).find(([, dicecloudName]) => dicecloudName === proficiency.name)?.[0];
    if (!matchingKey) continue;
    const value = Number(proficiency.value) || 1;
    result[matchingKey] = value >= 2 ? "expertise" : "proficient";
  }
  return result;
}

function formatDamage(value) {
  const text = normalizeName(value);
  return text.replace(/\s+/g, " ");
}

function mapAttacks(collections) {
  return (collections.attacks || [])
    .filter((attack) => attack.enabled !== false)
    .map((attack) => {
      const name = normalizeName(attack.name);
      const damage = formatDamage(
        attack.damage ||
          attack.damageDice ||
          attack.damageRoll ||
          attack.damageString ||
          "",
      );
      return {
        id: attack.id || slugify(name),
        name,
        damage,
        sub: [damage, normalizeName(attack.range), normalizeName(attack.attackBonus)]
          .filter(Boolean)
          .join(" - "),
        source: "dicecloud",
      };
    })
    .filter((attack) => attack.name);
}

function mapSpells(collections) {
  return (collections.spells || [])
    .filter((spell) => spell.prepared !== false && spell.removed !== true)
    .map((spell) => {
      const level = Number(spell.level) || 0;
      return {
        id: spell.id || slugify(spell.name),
        name: normalizeName(spell.name),
        level,
        prepared: spell.prepared !== "unprepared",
        sub: [
          level === 0 ? "Cantrip" : `Level ${level}`,
          normalizeName(spell.range),
          normalizeName(spell.duration),
        ]
          .filter(Boolean)
          .join(" - "),
      };
    })
    .filter((spell) => spell.name)
    .sort((a, b) => (a.level - b.level) || a.name.localeCompare(b.name));
}

function normalizeDicecloudCharacter(collections, sourceUrl, characterId) {
  const rawCharacter = (collections.characters || []).find((entry) => entry.id === characterId);
  if (!rawCharacter) {
    const error = new Error("Dicecloud did not return that character. Check the sheet is public and the link is correct.");
    error.statusCode = 404;
    throw error;
  }

  const { classes, context, stats } = computeStats(collections);
  const totalLevel = classes.reduce((sum, entry) => sum + entry.level, 0);
  const abilities = mapAbilities(stats);
  const maxHp = Number(stats.hitPoints || 0);
  const ac = Number(stats.armor || 10 + abilityMod(abilities.dex));
  const speed = Number(stats.speed || 30);
  const proficiencyBonus = Number(stats.proficiencyBonus || context.proficiencyBonus || 2);

  return {
    id: `dicecloud:${characterId}`,
    sourceKind: "dicecloud",
    sourceUrl: sourceUrl || createSourceUrl(characterId, rawCharacter),
    syncedAt: new Date().toISOString(),
    avatarUrl: normalizeName(rawCharacter.picture) || null,
    name: normalizeName(rawCharacter.name) || "Dicecloud Character",
    ancestry: normalizeName(rawCharacter.race),
    classes,
    level: totalLevel || null,
    abilities,
    hp: {
      max: maxHp || 0,
      current: maxHp || 0,
      temp: 0,
    },
    ac,
    speed,
    initiative: abilityMod(abilities.dex) + Number(stats.initiative || 0),
    proficiencyBonus,
    savingThrows: mapProficiency(collections.proficiencies, SAVE_STATS),
    skills: mapProficiency(collections.proficiencies, SKILL_STATS),
    attacks: mapAttacks(collections),
    spells: mapSpells(collections),
  };
}

async function fetchDicecloudCharacter(sourceUrl) {
  const characterId = extractDicecloudCharacterId(sourceUrl);
  if (!characterId) {
    const error = new Error("Enter a public Dicecloud v1 character share link.");
    error.statusCode = 400;
    throw error;
  }

  const collections = await subscribeDicecloudCharacter(characterId);
  return normalizeDicecloudCharacter(collections, sourceUrl, characterId);
}

module.exports = {
  extractDicecloudCharacterId,
  fetchDicecloudCharacter,
  normalizeDicecloudCharacter,
};
