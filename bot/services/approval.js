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
    .setPlaceholder(category === "spells" ? "Choose a spell level..." : "Choose a rarity...");

  if (category === "spells") {
    menu.addOptions(
      APPROVE_SPELL_LEVELS.map((level) => ({
        label: level.label,
        value: level.value,
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
  return ["weapons", "wondrous-items", "spells"].includes(category);
}

function getCategory(categoryValue) {
  return APPROVE_CATEGORIES.find((category) => category.value === categoryValue);
}

function getDetail(category, detailValue) {
  if (category === "spells") {
    return APPROVE_SPELL_LEVELS.find((level) => level.value === detailValue);
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

function buildApproveModal(discordUserId, category, detailValue = "none") {
  const target = getApproveTarget(category, detailValue === "none" ? "" : detailValue);
  const title = target?.detailLabel
    ? `Approve ${target.detailLabel} ${target.categoryLabel}`
    : `Approve ${target?.categoryLabel ?? "Homebrew"}`;

  const modal = new ModalBuilder()
    .setCustomId(`approve-modal:${discordUserId}:${category}:${detailValue}`)
    .setTitle(title.slice(0, 45));

  const nameInput = new TextInputBuilder()
    .setCustomId("homebrew-name")
    .setLabel("Homebrew name")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(200);

  const urlInput = new TextInputBuilder()
    .setCustomId("homebrew-url")
    .setLabel("D&D Beyond URL")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(500);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(urlInput),
  );

  return modal;
}

function buildApprovalAnnouncement(approval, approver) {
  const location = approval.detailLabel
    ? `${approval.detailLabel} ${approval.categoryLabel}`
    : approval.categoryLabel;

  return {
    content:
      `**Homebrew approved:** [${approval.label}](<${approval.href}>)\n` +
      `Category: ${location}\n` +
      `Approved by: ${approver}`,
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

async function approveHomebrew({ category, detailValue, name, url }) {
  const target = getApproveTarget(category, detailValue);

  if (!target) {
    throw new Error("unsupported_approve_target");
  }

  const href = normalizeHomebrewUrl(url);
  const label = formatApprovedLabel(name, target.labelSuffix);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

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
        title = EXCLUDED.title,
        sort_order = EXCLUDED.sort_order,
        is_published = true,
        updated_at = NOW()
      RETURNING id
      `,
      [target.section, target.title, target.slug, target.sortOrder],
    );
    const homebrewEntryId = entryResult.rows[0].id;

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
  getApproveTarget,
  getCategory,
};
