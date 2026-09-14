const { EmbedBuilder } = require("discord.js");
const pool = require("../db");
const config = require("../config");
const { truncateValue } = require("../utils");

const HOMEBREW_SECTION_LABELS = {
  feats: "Feat",
  spells: "Spell",
  species: "Species",
  weapons: "Weapon",
  "wondrous-items": "Wondrous Item",
  subclasses: "Subclass",
};

const HOMEBREW_SECTION_DOC_SLUGS = {
  feats: "homebrew/feats",
  spells: "homebrew/spells",
  species: "homebrew/species",
  weapons: "homebrew/weapons",
  "wondrous-items": "homebrew/wondrous-items",
  subclasses: "homebrew/subclasses",
};

const RARITY_LABELS = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  veryrare: "Very Rare",
  legendary: "Legendary",
};

function homebrewSectionLabel(section) {
  return HOMEBREW_SECTION_LABELS[section] || section;
}

function rarityLabel(rarity) {
  return RARITY_LABELS[rarity] || rarity;
}

// Docs are authored as plain markdown for embeds, but content fields sometimes
// include heading syntax (## Description) that Discord embeds render literally
// rather than as a heading, so fold headings into bold text instead.
function headingsToEmbedFriendlyText(markdown) {
  return (markdown || "").replace(/^#{1,6}\s+(.*)$/gm, "**$1**").trim();
}

async function searchLookupCandidates(query) {
  const trimmed = (query || "").trim().slice(0, 100);

  const [graces, boons, capstones, homebrewEntries, upgrades, items] =
    await Promise.all([
      pool.query(
        `
        SELECT id, title
        FROM starting_graces
        WHERE is_published = true
          AND ($1 = '' OR title ILIKE '%' || $1 || '%')
        ORDER BY LOWER(title) ASC
        LIMIT 25
        `,
        [trimmed],
      ),
      pool.query(
        `
        SELECT id, title
        FROM boons
        WHERE is_published = true
          AND ($1 = '' OR title ILIKE '%' || $1 || '%')
        ORDER BY LOWER(title) ASC
        LIMIT 25
        `,
        [trimmed],
      ),
      pool.query(
        `
        SELECT id, title
        FROM capstones
        WHERE is_published = true
          AND ($1 = '' OR title ILIKE '%' || $1 || '%')
        ORDER BY LOWER(title) ASC
        LIMIT 25
        `,
        [trimmed],
      ),
      pool.query(
        `
        SELECT id, title, section
        FROM homebrew_entries
        WHERE is_published = true
          AND ($1 = '' OR title ILIKE '%' || $1 || '%')
        ORDER BY LOWER(title) ASC
        LIMIT 25
        `,
        [trimmed],
      ),
      pool.query(
        `
        SELECT gu.id, gu.title, g.name AS guild_name
        FROM guild_upgrades gu
        JOIN guilds g ON g.id = gu.guild_id
        WHERE gu.is_published = true
          AND ($1 = '' OR gu.title ILIKE '%' || $1 || '%')
        ORDER BY LOWER(gu.title) ASC
        LIMIT 25
        `,
        [trimmed],
      ),
      pool.query(
        `
        SELECT id, name, rarity
        FROM magic_items
        WHERE is_published = true
          AND ($1 = '' OR name ILIKE '%' || $1 || '%')
        ORDER BY LOWER(name) ASC
        LIMIT 25
        `,
        [trimmed],
      ),
    ]);

  const candidates = [];

  for (const row of graces.rows) {
    candidates.push({
      key: `sg:${row.id}`,
      title: row.title,
      category: "Starting Grace",
    });
  }
  for (const row of boons.rows) {
    candidates.push({ key: `bn:${row.id}`, title: row.title, category: "Boon" });
  }
  for (const row of capstones.rows) {
    candidates.push({
      key: `cp:${row.id}`,
      title: row.title,
      category: "Capstone",
    });
  }
  for (const row of homebrewEntries.rows) {
    candidates.push({
      key: `he:${row.id}`,
      title: row.title,
      category: homebrewSectionLabel(row.section),
    });
  }
  for (const row of upgrades.rows) {
    candidates.push({
      key: `gu:${row.id}`,
      title: row.title,
      category: `${row.guild_name} Guild Perk`,
    });
  }
  for (const row of items.rows) {
    candidates.push({
      key: `mi:${row.id}`,
      title: `${row.name} (${rarityLabel(row.rarity)})`,
      category: "Magic Item",
    });
  }

  const normalizedQuery = trimmed.toLowerCase();
  candidates.sort((a, b) => {
    const aStarts = a.title.toLowerCase().startsWith(normalizedQuery) ? 0 : 1;
    const bStarts = b.title.toLowerCase().startsWith(normalizedQuery) ? 0 : 1;
    if (aStarts !== bStarts) {
      return aStarts - bStarts;
    }
    if (a.title.length !== b.title.length) {
      return a.title.length - b.title.length;
    }
    return a.title.localeCompare(b.title);
  });

  return candidates;
}

async function searchLookupEntries(query, limit = 25) {
  const candidates = await searchLookupCandidates(query);
  return candidates.slice(0, limit).map((candidate) => ({
    name: truncateValue(`${candidate.title} — ${candidate.category}`, 100),
    value: candidate.key,
  }));
}

async function getLookupEntryByKey(key) {
  if (typeof key !== "string" || !key.includes(":")) {
    return null;
  }

  const [source, idPart] = key.split(":");
  const id = Number(idPart);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  if (source === "sg" || source === "bn" || source === "cp") {
    const table =
      source === "sg" ? "starting_graces" : source === "bn" ? "boons" : "capstones";
    const category =
      source === "sg" ? "Starting Grace" : source === "bn" ? "Boon" : "Capstone";
    const docSlug =
      source === "sg"
        ? "homebrew/starting-graces"
        : source === "bn"
          ? "homebrew/boons"
          : "homebrew/capstones";

    const result = await pool.query(
      `SELECT title, content_markdown FROM ${table} WHERE id = $1 AND is_published = true`,
      [id],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      title: row.title,
      category,
      bodyMarkdown: row.content_markdown,
      docSlug,
    };
  }

  if (source === "he") {
    const result = await pool.query(
      `SELECT title, body_markdown, section FROM homebrew_entries WHERE id = $1 AND is_published = true`,
      [id],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      title: row.title,
      category: homebrewSectionLabel(row.section),
      bodyMarkdown: row.body_markdown,
      docSlug: HOMEBREW_SECTION_DOC_SLUGS[row.section] || null,
    };
  }

  if (source === "gu") {
    const result = await pool.query(
      `
      SELECT gu.title, gu.requirement, gu.reward, gu.details, g.name AS guild_name
      FROM guild_upgrades gu
      JOIN guilds g ON g.id = gu.guild_id
      WHERE gu.id = $1 AND gu.is_published = true
      `,
      [id],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }

    const fields = [
      {
        name: "Requirement",
        value: truncateValue(row.requirement || "Unknown", 1024),
      },
    ];
    if (row.reward) {
      fields.push({ name: "Reward", value: truncateValue(row.reward, 1024) });
    }
    if (row.details) {
      fields.push({ name: "Details", value: truncateValue(row.details, 1024) });
    }

    return {
      title: row.title,
      category: `${row.guild_name} Guild Perk`,
      fields,
    };
  }

  if (source === "mi") {
    const result = await pool.query(
      `SELECT name, rarity FROM magic_items WHERE id = $1 AND is_published = true`,
      [id],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      title: row.name,
      category: "Magic Item",
      fields: [{ name: "Rarity", value: rarityLabel(row.rarity) }],
    };
  }

  return null;
}

function buildLookupResultEmbed(entry) {
  const embed = new EmbedBuilder()
    .setTitle(truncateValue(entry.title, 256))
    .setFooter({ text: entry.category });

  if (entry.bodyMarkdown) {
    embed.setDescription(
      truncateValue(headingsToEmbedFriendlyText(entry.bodyMarkdown), 4096),
    );
  }

  if (entry.fields?.length) {
    embed.addFields(entry.fields);
  }

  if (entry.docSlug) {
    embed.setURL(`${config.publicSiteUrl}/docs/${entry.docSlug}`);
  }

  return embed;
}

module.exports = {
  buildLookupResultEmbed,
  getLookupEntryByKey,
  searchLookupCandidates,
  searchLookupEntries,
};
