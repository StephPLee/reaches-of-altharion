const DDB_CHARACTER_SERVICE_BASE_URL =
  "https://character-service.dndbeyond.com/character/v5";

const ABILITY_IDS = {
  1: "str",
  2: "dex",
  3: "con",
  4: "int",
  5: "wis",
  6: "cha",
};

const ABILITY_SCORE_MODIFIER_SUBTYPES = {
  str: "strength-score",
  dex: "dexterity-score",
  con: "constitution-score",
  int: "intelligence-score",
  wis: "wisdom-score",
  cha: "charisma-score",
};

const SAVE_SUBTYPES = {
  str: "strength-saving-throws",
  dex: "dexterity-saving-throws",
  con: "constitution-saving-throws",
  int: "intelligence-saving-throws",
  wis: "wisdom-saving-throws",
  cha: "charisma-saving-throws",
};

const SKILL_ENTITY_IDS = {
  2: "acrobatics",
  3: "athletics",
  4: "animal-handling",
  5: "stealth",
  6: "arcana",
  7: "history",
  8: "investigation",
  9: "nature",
  10: "religion",
  11: "insight",
  12: "medicine",
  13: "survival",
  14: "perception",
  15: "performance",
  16: "deception",
  17: "intimidation",
  18: "sleight-of-hand",
  19: "persuasion",
};

const SKILL_KEYS = [
  "acrobatics", "animal-handling", "arcana", "athletics", "deception",
  "history", "insight", "intimidation", "investigation", "medicine",
  "nature", "perception", "performance", "persuasion", "religion",
  "sleight-of-hand", "stealth", "survival",
];

function extractDdbCharacterId(input) {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value) return null;

  const directId = value.match(/^\d{4,}$/);
  if (directId) return directId[0];

  const urlId =
    value.match(/\/characters\/(\d+)/i) ||
    value.match(/[?&]characterId=(\d+)/i) ||
    value.match(/[?&]id=(\d+)/i);

  return urlId?.[1] || null;
}

function abilityMod(score) {
  return Math.floor((score - 10) / 2);
}

function findInventoryItemForModifier(character, modifier) {
  const componentId = Number(modifier?.componentId);
  if (!Number.isFinite(componentId)) return null;
  return (character.inventory || []).find((item) => Number(item.definition?.id) === componentId) || null;
}

function modifierIsActive(character, group, modifier) {
  if (group !== "item") return true;

  const item = findInventoryItemForModifier(character, modifier);
  if (!item) return false;
  if (item.equipped === false) return false;
  if ((modifier?.requiresAttunement || item.definition?.requiresAttunement) && !item.isAttuned) {
    return false;
  }
  return true;
}

function modifierNumericValue(modifier, abilities = null) {
  const rawDirect = modifier?.value ?? modifier?.fixedValue;
  if (rawDirect != null) {
    const direct = Number(rawDirect);
    if (Number.isFinite(direct)) return direct;
  }

  const statKey = ABILITY_IDS[modifier?.statId];
  if (statKey && abilities?.[statKey] != null) {
    return abilityMod(abilities[statKey]);
  }

  return 0;
}

function sumBonusModifiers(character, subType, abilities = null) {
  let total = 0;
  for (const [group, modifiers] of Object.entries(character.modifiers || {})) {
    if (!Array.isArray(modifiers)) continue;
    for (const modifier of modifiers) {
      if (modifier?.type !== "bonus" || modifier?.subType !== subType) continue;
      if (!modifierIsActive(character, group, modifier)) continue;
      total += modifierNumericValue(modifier, abilities);
    }
  }
  return total;
}

function mapHp(character, abilities, totalLevel) {
  const override = character.overrideHitPoints;
  const base = Number(character.baseHitPoints || 0);
  const bonus = Number(character.bonusHitPoints || 0);
  // DDB stores baseHitPoints as raw hit-dice totals only. CON modifier is not
  // included — it is computed client-side as CON mod × level. Any additional
  // per-level bonuses (e.g. Tough feat) also live in hit-points-per-level modifiers.
  const conMod = abilityMod(abilities.con || 10);
  const featPerLevel = sumBonusModifiers(character, "hit-points-per-level");
  const perLevel = (conMod + featPerLevel) * (totalLevel || 1);
  const max = override != null ? Number(override) : base + bonus + perLevel;
  const removed = Number(character.removedHitPoints || 0);
  const temp = Number(character.temporaryHitPoints || 0);
  return { max, current: Math.max(0, max - removed), temp };
}

function sumSetModifiers(character, subType) {
  // "set" type modifiers specify a fixed AC value rather than a bonus — take the highest.
  let best = null;
  for (const [group, modifiers] of Object.entries(character.modifiers || {})) {
    if (!Array.isArray(modifiers)) continue;
    for (const modifier of modifiers) {
      if (modifier?.type !== "set" || modifier?.subType !== subType) continue;
      if (!modifierIsActive(character, group, modifier)) continue;
      const val = Number(modifier.value ?? modifier.fixedValue ?? null);
      if (!Number.isFinite(val)) continue;
      if (best === null || val > best) best = val;
    }
  }
  return best;
}

function mapAc(character, abilities) {
  // DDB stores the "Override AC" value in characterValues with typeId 1.
  const acOverride = (character.characterValues || []).find((v) => v.typeId === 1);
  if (acOverride?.value != null) {
    return Number(acOverride.value);
  }

  // DDB stores the "Misc Bonus" AC value in characterValues with typeId 3.
  const acMiscBonus = (character.characterValues || []).find((v) => v.typeId === 3);

  const dexMod = abilityMod(abilities.dex || 10);
  let armorBase = null;
  let maxDexBonus = null;
  let shieldBonus = 0;

  for (const item of character.inventory || []) {
    if (item.equipped === false) continue;
    const def = item.definition || {};
    const armorTypeId = def.armorTypeId;
    // Detect armor by armorTypeId first, then fall back to filterType/type fields
    const isArmor = armorTypeId != null || def.filterType === "Armor" || def.type === "Armor";
    if (!isArmor) continue;

    if (armorTypeId === 4) {
      // Use the shield's actual armorClass (a +2 shield has armorClass: 2; magic bonus is in modifiers)
      shieldBonus = Math.max(shieldBonus, Number(def.armorClass || 2));
    } else if (armorTypeId === 1) {
      armorBase = Number(def.armorClass || 0);
    } else if (armorTypeId === 2) {
      armorBase = Number(def.armorClass || 0);
      maxDexBonus = 2;
    } else if (armorTypeId === 3) {
      armorBase = Number(def.armorClass || 0);
      maxDexBonus = 0;
    } else if (armorTypeId == null && def.armorClass) {
      // Magic/custom item with no armorTypeId but a known base AC — treat as light (full DEX)
      armorBase = Number(def.armorClass);
    }
  }

  // "set" type modifiers override the base AC to a fixed value (feats, natural armor, etc.).
  // Only apply when not wearing armor — wearing armor supersedes unarmored formulas.
  const setAc = armorBase === null ? (
    sumSetModifiers(character, "armor-class") ??
    sumSetModifiers(character, "unarmored-armor-class")
  ) : null;

  let base;
  if (setAc !== null) {
    base = setAc;
  } else if (armorBase !== null) {
    const dexContrib = maxDexBonus !== null ? Math.min(dexMod, maxDexBonus) : dexMod;
    base = armorBase + dexContrib;
  } else {
    base = 10 + dexMod;
  }

  base += shieldBonus;
  base += sumBonusModifiers(character, "armor-class");
  base += acMiscBonus?.value != null ? Number(acMiscBonus.value) : 0;
  return base;
}

function mapSpeed(character) {
  return Number(character.race?.weightSpeeds?.normal?.walk || 30);
}

function mapInitiative(character, abilities) {
  return abilityMod(abilities.dex || 10) + sumBonusModifiers(character, "initiative", abilities);
}

function mapProfBonus(character, totalLevel) {
  return Math.floor((Math.max(totalLevel, 1) - 1) / 4) + 2 + sumBonusModifiers(character, "proficiency-bonus");
}

function mapProficiency(character, keyToSubType, broadSubType = null) {
  const result = Object.fromEntries(Object.keys(keyToSubType).map((k) => [k, "none"]));
  for (const [group, modifiers] of Object.entries(character.modifiers || {})) {
    if (!Array.isArray(modifiers)) continue;
    for (const modifier of modifiers) {
      if (!modifierIsActive(character, group, modifier)) continue;
      if (broadSubType && modifier?.type === "half-proficiency" && modifier?.subType === broadSubType) {
        for (const key of Object.keys(result)) {
          if (result[key] === "none") result[key] = "half";
        }
      }
      for (const [key, subType] of Object.entries(keyToSubType)) {
        if (modifier?.subType !== subType) continue;
        if (modifier.type === "expertise") {
          result[key] = "expertise";
        } else if (
          (modifier.type === "proficiency" || modifier.type === "half-proficiency") &&
          result[key] !== "expertise"
        ) {
          result[key] = modifier.type === "half-proficiency" ? "half" : "proficient";
        }
      }
    }
  }
  return result;
}

function proficiencyValue(proficiency, proficiencyBonus) {
  if (proficiency === "expertise") return proficiencyBonus * 2;
  if (proficiency === "proficient") return proficiencyBonus;
  if (proficiency === "half") return Math.floor(proficiencyBonus / 2);
  return 0;
}

function mapCustomSkillBonuses(character) {
  const result = {};
  for (const entry of character.characterValues || []) {
    if (entry?.valueTypeId !== "1958004211") continue;
    if (![25, 26].includes(Number(entry.typeId))) continue;
    const key = SKILL_ENTITY_IDS[Number(entry.valueId)];
    if (!key) continue;
    result[key] = (result[key] || 0) + (Number(entry.value) || 0);
  }
  return result;
}

function mapNumericalBonuses(character, keyToSubType, abilities, broadSubType = null) {
  const result = Object.fromEntries(Object.keys(keyToSubType).map((k) => [k, 0]));
  for (const [group, modifiers] of Object.entries(character.modifiers || {})) {
    if (!Array.isArray(modifiers)) continue;
    for (const modifier of modifiers) {
      if (modifier?.type !== "bonus") continue;
      if (!modifierIsActive(character, group, modifier)) continue;

      if (broadSubType && modifier.subType === broadSubType) {
        const value = modifierNumericValue(modifier, abilities);
        for (const key of Object.keys(result)) result[key] += value;
      }

      for (const [key, subType] of Object.entries(keyToSubType)) {
        if (modifier.subType === subType) result[key] += modifierNumericValue(modifier, abilities);
      }
    }
  }
  return result;
}

function mapSavingThrowTotals(character, abilities, proficiencyBonus, savingThrows) {
  const bonuses = mapNumericalBonuses(character, SAVE_SUBTYPES, abilities, "saving-throws");
  return Object.fromEntries(Object.keys(SAVE_SUBTYPES).map((key) => {
    const base = abilityMod(abilities[key] || 10);
    const prof = proficiencyValue(savingThrows[key], proficiencyBonus);
    return [key, base + prof + (bonuses[key] || 0)];
  }));
}

function mapSkillTotals(character, abilities, proficiencyBonus, skills) {
  const skillAbilities = {
    acrobatics: "dex",
    "animal-handling": "wis",
    arcana: "int",
    athletics: "str",
    deception: "cha",
    history: "int",
    insight: "wis",
    intimidation: "cha",
    investigation: "int",
    medicine: "wis",
    nature: "int",
    perception: "wis",
    performance: "cha",
    persuasion: "cha",
    religion: "int",
    "sleight-of-hand": "dex",
    stealth: "dex",
    survival: "wis",
  };
  const subtypes = Object.fromEntries(SKILL_KEYS.map((key) => [key, key]));
  const bonuses = mapNumericalBonuses(character, subtypes, abilities, "ability-checks");
  const customBonuses = mapCustomSkillBonuses(character);

  return Object.fromEntries(SKILL_KEYS.map((key) => {
    const ability = skillAbilities[key];
    const base = abilityMod(abilities[ability] || 10);
    const prof = proficiencyValue(skills[key], proficiencyBonus);
    return [key, base + prof + (bonuses[key] || 0) + (customBonuses[key] || 0)];
  }));
}

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

function uniqueByName(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const name = normalizeName(item.name);
    if (!name) continue;
    const key = slugify(name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...item, id: item.id || key, name });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function compactText(parts) {
  return parts
    .map((part) => normalizeName(part))
    .filter(Boolean)
    .join(" · ");
}

function normalizeDamageType(value) {
  const name = normalizeName(
    typeof value === "object" && value !== null
      ? value.name || value.displayName
      : value,
  );
  return name.toLowerCase();
}

function formatDamage(diceString, damageType) {
  const dice = normalizeName(diceString);
  const type = normalizeDamageType(damageType);
  if (!dice) return "";
  return type ? `${dice}[${type}]` : dice;
}

function mapClasses(character) {
  return Array.isArray(character.classes)
    ? character.classes
        .map((entry) => {
          const className = normalizeName(entry.definition?.name);
          const subclassName = normalizeName(entry.subclassDefinition?.name);
          const level = Number(entry.level) || 0;
          return {
            name: className,
            subclass: subclassName,
            level,
          };
        })
        .filter((entry) => entry.name)
    : [];
}

function mapAbilities(character) {
  const abilities = {};
  for (const stat of character.stats || []) {
    const key = ABILITY_IDS[stat.id];
    if (!key) continue;
    const override = character.overrideStats?.find((entry) => entry.id === stat.id);
    const bonus = character.bonusStats?.find((entry) => entry.id === stat.id);
    const value = override?.value ?? stat.value;
    abilities[key] =
      Number(value || 0) +
      Number(bonus?.value || 0) +
      sumAbilityScoreModifiers(character, key);
  }
  return abilities;
}

function sumAbilityScoreModifiers(character, abilityKey) {
  const subtype = ABILITY_SCORE_MODIFIER_SUBTYPES[abilityKey];
  if (!subtype) return 0;

  let total = 0;
  for (const [group, modifiers] of Object.entries(character.modifiers || {})) {
    if (!Array.isArray(modifiers)) continue;
    for (const modifier of modifiers) {
      if (modifier?.type !== "bonus" || modifier?.subType !== subtype) continue;
      if (!modifierIsActive(character, group, modifier)) continue;
      total += modifierNumericValue(modifier);
    }
  }
  return total;
}

function mapInventoryAttacks(character) {
  const attacks = [];
  for (const item of character.inventory || []) {
    const definition = item.definition || {};
    const name = normalizeName(definition.name);
    if (!name) continue;

    const isWeapon =
      definition.filterType === "Weapon" ||
      definition.type === "Weapon" ||
      definition.attackType ||
      definition.damage?.diceString;
    const isEquipped = item.equipped !== false;
    if (!isWeapon || !isEquipped) continue;

    attacks.push({
      id: slugify(name),
      name,
      damage: formatDamage(definition.damage?.diceString, definition.damageType),
      sub: compactText([
        definition.damage?.diceString,
        normalizeDamageType(definition.damageType),
        definition.range ? `${definition.range} ft` : "",
      ]),
      source: "inventory",
    });
  }
  return attacks;
}

function mapActionAttacks(character) {
  const attacks = [];
  const actionGroups = character.actions || {};
  for (const group of Object.values(actionGroups)) {
    if (!Array.isArray(group)) continue;
    for (const action of group) {
      const name = normalizeName(action.name || action.definition?.name);
      if (!name) continue;
      const hasAttackData = Boolean(
        action.attackType ||
          action.definition?.attackType ||
          action.dice?.diceString ||
          action.definition?.dice?.diceString,
      );
      if (!hasAttackData) continue;

      const activation = action.activation || action.definition?.activation;
      const diceString = action.dice?.diceString || action.definition?.dice?.diceString;
      const damageType =
        action.damageType ||
        action.definition?.damageType ||
        action.dice?.diceType ||
        action.definition?.dice?.diceType;
      attacks.push({
        id: slugify(name),
        name,
        damage: formatDamage(diceString, damageType),
        sub: compactText([
          action.attackType || action.definition?.attackType,
          diceString,
          normalizeDamageType(damageType),
          activation?.activationType,
        ]),
        source: "action",
      });
    }
  }
  return attacks;
}

function mapSpells(character) {
  const spells = [];
  for (const spellEntry of collectSpellEntries([character.spells, character.classSpells])) {
    const definition = spellEntry.definition || spellEntry;
    const name = normalizeName(definition.name);
    if (!name) continue;
    spells.push({
      id: slugify(name),
      name,
      level: Number(definition.level ?? spellEntry.level ?? 0) || 0,
      prepared: Boolean(spellEntry.prepared || spellEntry.alwaysPrepared || definition.level === 0),
      sub: compactText([
        definition.level === 0 ? "Cantrip" : `Level ${definition.level}`,
        definition.range?.origin || spellEntry.range?.origin,
        definition.duration?.durationType,
      ]),
    });
  }
  return uniqueByName(spells).sort((a, b) => (a.level - b.level) || a.name.localeCompare(b.name));
}

function collectSpellEntries(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (entry?.definition?.name || entry?.name) return [entry];
      return collectSpellEntries(entry);
    });
  }
  if (typeof value === "object") {
    return Object.values(value).flatMap((entry) => collectSpellEntries(entry));
  }
  return [];
}

function normalizeDdbCharacter(rawCharacter, sourceUrl) {
  const classes = mapClasses(rawCharacter);
  const totalLevel = classes.reduce((sum, entry) => sum + entry.level, 0);
  const attacks = uniqueByName([
    ...mapInventoryAttacks(rawCharacter),
    ...mapActionAttacks(rawCharacter),
  ]);
  const abilities = mapAbilities(rawCharacter);
  const proficiencyBonus = mapProfBonus(rawCharacter, totalLevel || 1);
  const skillProfKeys = Object.fromEntries(SKILL_KEYS.map((k) => [k, k]));
  const savingThrows = mapProficiency(rawCharacter, SAVE_SUBTYPES);
  const skills = mapProficiency(rawCharacter, skillProfKeys, "ability-checks");

  return {
    id: String(rawCharacter.id || ""),
    sourceUrl,
    syncedAt: new Date().toISOString(),
    avatarUrl: typeof rawCharacter.decorations?.avatarUrl === "string" && rawCharacter.decorations.avatarUrl ? rawCharacter.decorations.avatarUrl : null,
    name: normalizeName(rawCharacter.name) || "D&D Beyond Character",
    ancestry: normalizeName(
      rawCharacter.race?.fullName ||
        rawCharacter.race?.baseName ||
        rawCharacter.race?.definition?.name,
    ),
    classes,
    level: totalLevel || null,
    abilities,
    hp: mapHp(rawCharacter, abilities, totalLevel || 1),
    ac: mapAc(rawCharacter, abilities),
    speed: mapSpeed(rawCharacter),
    initiative: mapInitiative(rawCharacter, abilities),
    proficiencyBonus,
    savingThrows,
    savingThrowTotals: mapSavingThrowTotals(rawCharacter, abilities, proficiencyBonus, savingThrows),
    skills,
    skillTotals: mapSkillTotals(rawCharacter, abilities, proficiencyBonus, skills),
    attacks,
    spells: mapSpells(rawCharacter),
  };
}

async function fetchDdbCharacter(sourceUrl) {
  const characterId = extractDdbCharacterId(sourceUrl);
  if (!characterId) {
    const error = new Error("Enter a public D&D Beyond character share link.");
    error.statusCode = 400;
    throw error;
  }

  const requestUrl = `${DDB_CHARACTER_SERVICE_BASE_URL}/character/${characterId}?includeCustomItems=true`;
  const response = await fetch(requestUrl, {
    headers: {
      accept: "application/json",
      "user-agent": "ReachesOfAltharion/1.0",
    },
  });

  if (response.status === 403 || response.status === 404) {
    const error = new Error("D&D Beyond did not return that character. Check the sheet is public and the link is correct.");
    error.statusCode = 404;
    throw error;
  }

  if (!response.ok) {
    const error = new Error("D&D Beyond is not returning character data right now.");
    error.statusCode = 502;
    throw error;
  }

  const payload = await response.json();
  if (!payload?.success || !payload?.data) {
    const error = new Error("D&D Beyond returned an unexpected character response.");
    error.statusCode = 502;
    throw error;
  }

  return normalizeDdbCharacter(payload.data, sourceUrl);
}

module.exports = {
  extractDdbCharacterId,
  fetchDdbCharacter,
  normalizeDdbCharacter,
};
