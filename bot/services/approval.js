const {
  ActionRowBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const pool = require("../db");

const APPROVE_CATEGORIES = [
  {
    value: "weapons",
    label: "Weapons",
    description: "Approve a homebrew weapon.",
  },
  {
    value: "wondrous-items",
    label: "Wondrous Items",
    description: "Approve a homebrew wondrous item.",
  },
  {
    value: "species",
    label: "Species",
    description: "Approve a homebrew species.",
  },
  {
    value: "feats",
    label: "Feats",
    description: "Approve a homebrew feat.",
  },
  {
    value: "subclasses",
    label: "Subclasses",
    description: "Approve a homebrew subclass.",
  },
  {
    value: "spells",
    label: "Spells",
    description: "Approve a homebrew spell.",
  },
  {
    value: "starting-graces",
    label: "Starting Graces",
    description: "Approve a starting grace.",
  },
  {
    value: "boons",
    label: "Boons",
    description: "Approve a boon.",
  },
  {
    value: "capstones",
    label: "Capstones",
    description: "Approve a class capstone.",
  },
];

const APPROVE_RARITIES = [
  { value: "common", label: "Common", sortOrder: 10 },
  { value: "uncommon", label: "Uncommon", sortOrder: 20 },
  { value: "rare", label: "Rare", sortOrder: 30 },
  { value: "very-rare", label: "Very Rare", sortOrder: 40 },
  { value: "legendary", label: "Legendary", sortOrder: 50 },
  { value: "artifact", label: "Artifact", sortOrder: 60 },
];

const APPROVE_WONDROUS_RARITIES = [
  ...APPROVE_RARITIES,
  { value: "varies", label: "Varies", sortOrder: 70 },
];

const APPROVE_SPELL_LEVELS = [
  {
    value: "cantrip",
    label: "Cantrip",
    title: "Cantrips",
    slug: "spell-cantrips",
    sortOrder: 10,
  },
  { value: "1st", label: "1st Level", title: "1st Level Spells", sortOrder: 20 },
  { value: "2nd", label: "2nd Level", title: "2nd Level Spells", sortOrder: 30 },
  { value: "3rd", label: "3rd Level", title: "3rd Level Spells", sortOrder: 40 },
  { value: "4th", label: "4th Level", title: "4th Level Spells", sortOrder: 50 },
  { value: "5th", label: "5th Level", title: "5th Level Spells", sortOrder: 60 },
  { value: "6th", label: "6th Level", title: "6th Level Spells", sortOrder: 70 },
  { value: "7th", label: "7th Level", title: "7th Level Spells", sortOrder: 80 },
  { value: "8th", label: "8th Level", title: "8th Level Spells", sortOrder: 90 },
  { value: "9th", label: "9th Level", title: "9th Level Spells", sortOrder: 100 },
];

const APPROVE_SUBCLASS_CLASSES = [
  {
    value: "artificer",
    label: "Artificer",
    title: "Artificer | Specialists",
    sortOrder: 10,
  },
  {
    value: "barbarian",
    label: "Barbarian",
    title: "Barbarian | Paths",
    sortOrder: 20,
  },
  {
    value: "bard",
    label: "Bard",
    title: "Bard | Colleges",
    sortOrder: 30,
  },
  {
    value: "blood-hunter",
    label: "Blood Hunter",
    title: "Blood Hunter | Orders",
    sortOrder: 40,
  },
  {
    value: "cleric",
    label: "Cleric",
    title: "Cleric | Domains",
    sortOrder: 50,
  },
  {
    value: "druid",
    label: "Druid",
    title: "Druid | Circles",
    sortOrder: 60,
  },
  {
    value: "fighter",
    label: "Fighter",
    title: "Fighter | Martial Archetypes",
    sortOrder: 70,
  },
  {
    value: "gunslinger",
    label: "Gunslinger",
    title: "Gunslinger | ???",
    sortOrder: 80,
  },
  {
    value: "illrigger",
    label: "Illrigger",
    title: "Illrigger | Diabolic Contracts",
    sortOrder: 90,
  },
  {
    value: "monk",
    label: "Monk",
    title: "Monk | Warriors",
    sortOrder: 100,
  },
  {
    value: "monster-hunter",
    label: "Monster Hunter",
    title: "Monster Hunter | Hunting Guilds",
    sortOrder: 110,
  },
  {
    value: "paladin",
    label: "Paladin",
    title: "Paladin | Oaths",
    sortOrder: 120,
  },
  {
    value: "ranger",
    label: "Ranger",
    title: "Ranger | Conclaves",
    sortOrder: 130,
  },
  {
    value: "rogue",
    label: "Rogue",
    title: "Rogue | Roguish Archetypes",
    sortOrder: 140,
  },
  {
    value: "sorcerer",
    label: "Sorcerer",
    title: "Sorcerer | Bloodlines",
    sortOrder: 150,
  },
  {
    value: "warlock",
    label: "Warlock",
    title: "Warlock | Patrons",
    sortOrder: 160,
  },
  {
    value: "wizard",
    label: "Wizard",
    title: "Wizard | Schools",
    sortOrder: 170,
  },
];


function buildApproveCategoryRow(discordUserId) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`approve-category:${discordUserId}`)
    .setPlaceholder("Choose a homebrew type...")
    .addOptions(APPROVE_CATEGORIES);

  return new ActionRowBuilder().addComponents(menu);
}

function buildApproveDetailRow(discordUserId, category) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`approve-detail:${discordUserId}:${category}`)
    .setPlaceholder(
      category === "spells"
        ? "Choose a spell level..."
        : category === "subclasses"
          ? "Choose the parent class..."
          : "Choose a rarity...",
    );

  if (category === "spells") {
    menu.addOptions(
      APPROVE_SPELL_LEVELS.map((level) => ({
        label: level.label,
        value: level.value,
      })),
    );
  } else if (category === "subclasses") {
    menu.addOptions(
      APPROVE_SUBCLASS_CLASSES.map((subclassClass) => ({
        label: subclassClass.label,
        value: subclassClass.value,
      })),
    );
  } else {
    const rarities =
      category === "wondrous-items"
        ? APPROVE_WONDROUS_RARITIES
        : APPROVE_RARITIES;
    menu.addOptions(
      rarities.map((rarity) => ({
        label: rarity.label,
        value: rarity.value,
      })),
    );
  }

  return new ActionRowBuilder().addComponents(menu);
}

function categoryNeedsDetail(category) {
  return ["weapons", "wondrous-items", "spells", "subclasses"].includes(category);
}

function categoryUsesMarkdown(category) {
  return ["starting-graces", "boons", "capstones"].includes(category);
}

function getCategory(categoryValue) {
  return APPROVE_CATEGORIES.find((category) => category.value === categoryValue);
}

function getDetail(category, detailValue) {
  if (category === "spells") {
    return APPROVE_SPELL_LEVELS.find((level) => level.value === detailValue);
  }

  if (category === "subclasses") {
    return APPROVE_SUBCLASS_CLASSES.find(
      (subclassClass) => subclassClass.value === detailValue,
    );
  }

  const rarities =
    category === "wondrous-items"
      ? APPROVE_WONDROUS_RARITIES
      : APPROVE_RARITIES;
  return rarities.find((rarity) => rarity.value === detailValue);
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getApproveTarget(category, detailValue = "") {
  const categoryConfig = getCategory(category);

  if (!categoryConfig) {
    return null;
  }

  if (category === "weapons") {
    const rarity = getDetail(category, detailValue);
    if (!rarity) {
      return null;
    }

    return {
      section: category,
      title: `${rarity.label} Weapons`,
      slug: `${rarity.value}-weapons`,
      sortOrder: rarity.sortOrder,
      labelSuffix: `${rarity.label} Weapon`,
      categoryLabel: categoryConfig.label,
      detailLabel: rarity.label,
    };
  }

  if (category === "wondrous-items") {
    const rarity = getDetail(category, detailValue);
    if (!rarity) {
      return null;
    }

    const noun = rarity.value === "varies" ? "Wondrous Item" : "Wondrous Items";
    return {
      section: category,
      title: `${rarity.label} ${noun}`,
      slug: `${rarity.value}-wondrous-${rarity.value === "varies" ? "item" : "items"}`,
      sortOrder: rarity.sortOrder,
      labelSuffix: `${rarity.label} Wondrous Item`,
      categoryLabel: categoryConfig.label,
      detailLabel: rarity.label,
    };
  }

  if (category === "spells") {
    const level = getDetail(category, detailValue);
    if (!level) {
      return null;
    }

    return {
      section: category,
      title: level.title,
      slug: level.slug ?? `spell-${level.value}-level`,
      sortOrder: level.sortOrder,
      labelSuffix: `${level.label} Spell`,
      categoryLabel: categoryConfig.label,
      detailLabel: level.label,
    };
  }

  if (category === "subclasses") {
    const subclassClass = getDetail(category, detailValue);
    if (!subclassClass) {
      return null;
    }

    return {
      section: category,
      title: subclassClass.title,
      slug: slugify(subclassClass.title),
      sortOrder: subclassClass.sortOrder,
      labelSuffix: "",
      categoryLabel: categoryConfig.label,
      detailLabel: subclassClass.label,
    };
  }

  return {
    section: category,
    title: categoryConfig.label,
    slug: slugify(categoryConfig.label),
    sortOrder: 10,
    labelSuffix: "",
    categoryLabel: categoryConfig.label,
    detailLabel: "",
  };
}

function formatApprovedLabel(name, labelSuffix) {
  const trimmedName = name.trim();

  if (!labelSuffix || trimmedName.toLowerCase().includes(labelSuffix.toLowerCase())) {
    return trimmedName;
  }

  return `${trimmedName} - ${labelSuffix}`;
}

function buildApproveModal(discordUserId, category, detailValue = "none", prefill = {}) {
  const target = getApproveTarget(category, detailValue === "none" ? "" : detailValue);
  const title = target?.detailLabel
    ? `Approve ${target.detailLabel} ${target.categoryLabel}`
    : `Approve ${target?.categoryLabel ?? "Homebrew"}`;
  const usesMarkdown = categoryUsesMarkdown(category);

  const modal = new ModalBuilder()
    .setCustomId(`approve-modal:${discordUserId}:${category}:${detailValue}`)
    .setTitle(title.slice(0, 45));

  const nameInput = new TextInputBuilder()
    .setCustomId("homebrew-name")
    .setLabel("Homebrew name")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(200);
  if (prefill.name) nameInput.setValue(prefill.name.slice(0, 200));

  const contentInput = new TextInputBuilder()
    .setCustomId(usesMarkdown ? "homebrew-markdown" : "homebrew-url")
    .setLabel(usesMarkdown ? "Markdown text" : "D&D Beyond URL")
    .setStyle(usesMarkdown ? TextInputStyle.Paragraph : TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(usesMarkdown ? 4000 : 500);
  if (!usesMarkdown && prefill.url) contentInput.setValue(prefill.url.slice(0, 500));

  const threadLinkReadable = Boolean(prefill.threadUrl);
  const submissionLinkReadable = Boolean(prefill.submissionUrl);

  const threadInput = new TextInputBuilder()
    .setCustomId("discussion-thread")
    .setLabel(threadLinkReadable ? "Workshop thread link (optional)" : "Workshop thread link")
    .setStyle(TextInputStyle.Short)
    .setRequired(!threadLinkReadable)
    .setMaxLength(500);
  if (prefill.threadUrl) threadInput.setValue(prefill.threadUrl.slice(0, 500));

  const submissionInput = new TextInputBuilder()
    .setCustomId("discussion-message")
    .setLabel(submissionLinkReadable ? "Submission message link (optional)" : "Submission message link")
    .setStyle(TextInputStyle.Short)
    .setRequired(!submissionLinkReadable)
    .setMaxLength(500);
  if (prefill.submissionUrl) submissionInput.setValue(prefill.submissionUrl.slice(0, 500));

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(contentInput),
    new ActionRowBuilder().addComponents(threadInput),
    new ActionRowBuilder().addComponents(submissionInput),
  );

  return modal;
}

function buildApprovalAnnouncement(approval, approver) {
  const location = approval.detailLabel
    ? `${approval.detailLabel} ${approval.categoryLabel}`
    : approval.categoryLabel;
  const approvedItem = approval.href
    ? `[${approval.label}](<${approval.href}>)`
    : `**${approval.label}**`;
  const siteLine = approval.sitePath ? `\nSite path: ${approval.sitePath}` : "";

  return {
    content:
      `**Homebrew approved:** ${approvedItem}\n` +
      `Category: ${location}\n` +
      `Approved by: ${approver}${siteLine}`,
    allowedMentions: {
      parse: [],
    },
  };
}

function normalizeHomebrewUrl(url) {
  const trimmedUrl = url.trim();
  const parsed = new URL(trimmedUrl);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("unsupported_protocol");
  }

  return parsed.toString();
}

function getMarkdownApproveTarget(category) {
  const categoryConfig = getCategory(category);

  if (category === "starting-graces") {
    return {
      table: "starting_graces",
      categoryLabel: categoryConfig.label,
      sitePathPrefix: "/docs/homebrew/starting-graces#grace-",
    };
  }

  if (category === "boons") {
    return {
      table: "boons",
      categoryLabel: categoryConfig.label,
      sitePathPrefix: "/docs/homebrew/boons#boon-",
    };
  }

  if (category === "capstones") {
    return {
      table: "capstones",
      categoryLabel: categoryConfig.label,
      sitePathPrefix: "/docs/homebrew/capstones#capstone-",
    };
  }

  return null;
}

async function approveMarkdownHomebrew({ category, name, contentMarkdown }) {
  const target = getMarkdownApproveTarget(category);

  if (!target) {
    throw new Error("unsupported_markdown_approve_target");
  }

  const title = name.trim();
  const markdown = contentMarkdown.trim();
  const slug = slugify(title);

  if (!title || !slug || !markdown) {
    throw new Error("invalid_markdown_homebrew");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingResult = await client.query(
      `
      SELECT id
      FROM ${target.table}
      WHERE slug = $1 OR LOWER(title) = LOWER($2)
      LIMIT 1
      `,
      [slug, title],
    );

    const existingId = existingResult.rows[0]?.id;
    const result = existingId
      ? await client.query(
          `
          UPDATE ${target.table}
          SET
            title = $2,
            slug = $3,
            content_markdown = $4,
            is_published = true,
            updated_at = NOW()
          WHERE id = $1
          RETURNING id, title, slug, content_markdown
          `,
          [existingId, title, slug, markdown],
        )
      : await client.query(
          `
          INSERT INTO ${target.table} (
            title,
            slug,
            content_markdown,
            sort_order,
            is_published
          )
          VALUES ($1, $2, $3, 0, true)
          RETURNING id, title, slug, content_markdown
          `,
          [title, slug, markdown],
        );

    await client.query("COMMIT");

    return {
      categoryLabel: target.categoryLabel,
      detailLabel: "",
      label: result.rows[0].title,
      slug: result.rows[0].slug,
      sitePath: `${target.sitePathPrefix}${result.rows[0].slug}`,
      created: !existingId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function approveHomebrew({ category, detailValue, name, url, contentMarkdown }) {
  if (categoryUsesMarkdown(category)) {
    return approveMarkdownHomebrew({ category, name, contentMarkdown });
  }

  const target = getApproveTarget(category, detailValue);

  if (!target) {
    throw new Error("unsupported_approve_target");
  }

  const href = normalizeHomebrewUrl(url);
  const label = formatApprovedLabel(name, target.labelSuffix);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingEntryResult = await client.query(
      `
      SELECT id
      FROM homebrew_entries
      WHERE section = $1
        AND (
          slug = $2
          OR LOWER(title) = LOWER($3)
        )
      ORDER BY
        CASE
          WHEN LOWER(title) = LOWER($3) THEN 0
          ELSE 1
        END,
        id ASC
      LIMIT 1
      `,
      [target.section, target.slug, target.title],
    );

    let homebrewEntryId = existingEntryResult.rows[0]?.id ?? null;

    if (homebrewEntryId) {
      const entryResult = await client.query(
        `
        UPDATE homebrew_entries
        SET
          title = $2,
          sort_order = $3,
          is_published = true,
          updated_at = NOW()
        WHERE id = $1
        RETURNING id
        `,
        [homebrewEntryId, target.title, target.sortOrder],
      );
      homebrewEntryId = entryResult.rows[0].id;
    } else {
      const entryResult = await client.query(
        `
        INSERT INTO homebrew_entries (
          section,
          title,
          slug,
          body_markdown,
          sort_order,
          is_published
        )
        VALUES ($1, $2, $3, '', $4, true)
        ON CONFLICT (slug) DO UPDATE
        SET
          section = EXCLUDED.section,
          title = EXCLUDED.title,
          sort_order = EXCLUDED.sort_order,
          is_published = true,
          updated_at = NOW()
        RETURNING id
        `,
        [target.section, target.title, target.slug, target.sortOrder],
      );
      homebrewEntryId = entryResult.rows[0].id;
    }

    const itemResult = await client.query(
      `
      WITH inserted AS (
        INSERT INTO homebrew_section_items (
          homebrew_entry_id,
          parent_item_id,
          label,
          href,
          sort_order,
          is_published
        )
        SELECT $1, NULL, $2, $3, 0, true
        WHERE NOT EXISTS (
          SELECT 1
          FROM homebrew_section_items existing
          WHERE existing.homebrew_entry_id = $1
            AND (
              existing.href = $3
              OR LOWER(existing.label) = LOWER($2)
            )
        )
        RETURNING id, label, href, true AS created
      )
      SELECT id, label, href, created
      FROM inserted
      UNION ALL
      SELECT id, label, href, false AS created
      FROM homebrew_section_items existing
      WHERE existing.homebrew_entry_id = $1
        AND (
          existing.href = $3
          OR LOWER(existing.label) = LOWER($2)
        )
      LIMIT 1
      `,
      [homebrewEntryId, label, href],
    );

    await client.query("COMMIT");

    return {
      ...target,
      label: itemResult.rows[0].label,
      href: itemResult.rows[0].href,
      created: itemResult.rows[0].created,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}


module.exports = {
  APPROVE_CATEGORIES,
  approveHomebrew,
  buildApprovalAnnouncement,
  buildApproveCategoryRow,
  buildApproveDetailRow,
  buildApproveModal,
  categoryNeedsDetail,
  categoryUsesMarkdown,
  getApproveTarget,
  getCategory,
};
