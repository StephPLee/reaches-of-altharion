// Parses the embed Avrae posts for `!sb all` into a character's levelled
// spell list. Cantrips are skipped because wizards cannot copy them into a
// spellbook; DC, attack bonus and slot fields are skipped as well.

const LEVEL_FIELD_PATTERN = /^(\d)(?:st|nd|rd|th) Level/i;
const CHARACTER_NAME_PATTERN = /^(.+?) has \d+ spells/i;

function stripMarkdown(value) {
  return String(value || "")
    .replace(/[_*~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSpellName(value) {
  return stripMarkdown(value)
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

function parseAvraeSpellbookEmbed(embed) {
  if (!embed) {
    return { error: "That doesn't look like an Avrae `!sb all` message." };
  }

  const spells = [];
  const seen = new Set();
  let currentLevel = null;
  let foundLevelField = false;

  for (const field of embed.fields || []) {
    const name = stripMarkdown(field.name);
    const levelMatch = name.match(LEVEL_FIELD_PATTERN);

    if (levelMatch) {
      currentLevel = Number(levelMatch[1]);
      foundLevelField = true;
    } else if (!isBlankFieldName(field.name) || currentLevel === null) {
      // Cantrips, DC, Spell Attack Bonus, Spell Slots, or anything else that
      // is not a levelled spell list. A blank-named field continues the
      // previous level's list, since Avrae splits long lists that way.
      currentLevel = null;
      continue;
    }

    if (currentLevel < 1 || currentLevel > 9) continue;

    for (const part of String(field.value || "").split(/,|\n/)) {
      const spellName = cleanSpellName(part);
      if (!spellName) continue;
      const key = spellName.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      spells.push({ name: spellName, level: currentLevel });
    }
  }

  if (!foundLevelField) {
    return { error: "That doesn't look like an Avrae `!sb all` message." };
  }

  const characterName = getCharacterName(embed);
  if (!characterName) {
    return { error: "I couldn't find the character's name in that Avrae message." };
  }

  return { characterName, spells };
}

module.exports = { parseAvraeSpellbookEmbed };
