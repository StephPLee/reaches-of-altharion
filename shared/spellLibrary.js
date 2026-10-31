// Parses the embeds Avrae posts for `!sb all` into a character's levelled
// spell list. Long spellbooks are split across several messages, so the
// embeds are parsed together; the character name comes from the first one.
// Cantrips are skipped because wizards cannot copy them into a spellbook; DC,
// attack bonus and slot fields are skipped as well. Spells under "Unknown"
// have no level, so they are returned separately.

const LEVEL_FIELD_PATTERN = /^(\d)(?:st|nd|rd|th) Level/i;
const UNKNOWN_FIELD_PATTERN = /^Unknown\b/i;
const CHARACTER_NAME_PATTERN = /^(.+?) has \d+ spells/i;
const UNKNOWN_LEVEL = 0;

function stripMarkdown(value) {
  return String(value || "")
    .replace(/[_*~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSpellName(value) {
  return stripMarkdown(
    // "(**)" marks a spell provided by multiple sources.
    String(value || "").replace(/\(\s*\*+\s*\)/g, ""),
  )
    .replace(/(?:\.\.\.|…)$/, "")
    .trim();
}

function isBlankFieldName(name) {
  return !String(name || "").replace(/[\s​]/g, "");
}

function getCharacterName(embed) {
  const description = stripMarkdown(embed.description);
  const match = description.match(CHARACTER_NAME_PATTERN);
  if (match) return match[1].trim();
  return stripMarkdown(embed.title) || stripMarkdown(embed.author?.name) || "";
}

// Returns the spell lists in one embed as [{ name, level }], with level
// UNKNOWN_LEVEL for the "Unknown" section, or null if the embed has no spell
// list fields at all.
function parseEmbedSpells(embed) {
  const spells = [];
  let currentLevel = null;
  let foundSpellField = false;

  for (const field of embed?.fields || []) {
    const name = stripMarkdown(field.name);
    const levelMatch = name.match(LEVEL_FIELD_PATTERN);

    if (levelMatch) {
      currentLevel = Number(levelMatch[1]);
      foundSpellField = true;
    } else if (UNKNOWN_FIELD_PATTERN.test(name)) {
      currentLevel = UNKNOWN_LEVEL;
      foundSpellField = true;
    } else if (!isBlankFieldName(field.name) || currentLevel === null) {
      // Cantrips, DC, Spell Attack Bonus, Spell Slots, or anything else that
      // is not a levelled spell list. A blank-named field continues the
      // previous level's list, since Avrae splits long lists that way.
      currentLevel = null;
      continue;
    }

    if (currentLevel !== UNKNOWN_LEVEL && (currentLevel < 1 || currentLevel > 9)) {
      continue;
    }

    for (const part of String(field.value || "").split(/,|\n/)) {
      const spellName = cleanSpellName(part);
      if (spellName) spells.push({ name: spellName, level: currentLevel });
    }
  }

  return foundSpellField ? spells : null;
}

// Returns { characterName, spells: [{ name, level }], unknownSpells: [name] }
// or { error }.
function parseAvraeSpellbookEmbeds(embeds) {
  const parsedEmbeds = embeds.map(parseEmbedSpells);

  if (!parsedEmbeds[0]) {
    return { error: "That doesn't look like an Avrae `!sb all` message." };
  }
  if (parsedEmbeds.slice(1).some((parsed) => !parsed)) {
    return {
      error: "The second message doesn't look like the rest of an Avrae `!sb all` list.",
    };
  }

  const characterName = getCharacterName(embeds[0]);
  if (!characterName) {
    return {
      error: "I couldn't find the character's name in that Avrae message. If Avrae split the list in two, pass the first message as `message-link` and the second as `second-message-link`.",
    };
  }

  // A spell listed both with a level and under "Unknown" keeps its level.
  const levelled = new Map();
  const unknown = new Map();
  for (const spell of parsedEmbeds.flat()) {
    const key = spell.name.toLowerCase();
    if (spell.level === UNKNOWN_LEVEL) {
      if (!unknown.has(key)) unknown.set(key, spell.name);
    } else if (!levelled.has(key)) {
      levelled.set(key, spell);
    }
  }
  for (const key of levelled.keys()) unknown.delete(key);

  return {
    characterName,
    spells: [...levelled.values()],
    unknownSpells: [...unknown.values()],
  };
}

module.exports = { parseAvraeSpellbookEmbeds };
