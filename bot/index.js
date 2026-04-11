const path = require("path");
const dotenv = require("dotenv");

// Support both project-root .env and bot/.env.
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, ".env") });

const {
  ActionRowBuilder,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  ModalBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { Pool } = require("pg");

const requiredEnv = [
  "DISCORD_TOKEN",
  "DISCORD_CLIENT_ID",
  "DISCORD_GUILD_ID",
  "DATABASE_URL",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID,
  databaseUrl: process.env.DATABASE_URL,
  requiredRoleId: process.env.REQUIRED_ROLE_ID || "",
};

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: { rejectUnauthorized: false },
});

const commands = [
  new SlashCommandBuilder()
    .setName("cc-link")
    .setDescription("Get your assigned character creation campaign link."),
  new SlashCommandBuilder()
    .setName("magicitem")
    .setDescription("Roll a random magic item from a selected rarity."),
  new SlashCommandBuilder()
    .setName("approve")
    .setDescription("Approve a homebrew link for the site."),
].map((command) => command.toJSON());

const MAGIC_ITEM_RARITIES = [
  {
    value: "common",
    label: "Common",
    description: "Roll a random common magic item.",
  },
  {
    value: "uncommon",
    label: "Uncommon",
    description: "Roll a random uncommon magic item.",
  },
  {
    value: "rare",
    label: "Rare",
    description: "Roll a random rare magic item.",
  },
  {
    value: "veryrare",
    label: "Very Rare",
    description: "Roll a random very rare magic item.",
  },
  {
    value: "legendary",
    label: "Legendary",
    description: "Roll a random legendary magic item.",
  },
];

const MAGIC_ITEM_RESULT_GIF_URL =
  "https://cdn.discordapp.com/attachments/1088129532214644776/1465689802887401607/rashaken-idleon.gif";

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

async function registerGuildCommands() {
  const rest = new REST({ version: "10" }).setToken(config.token);
  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commands },
  );
  console.log("Slash commands registered: /cc-link, /magicitem, /approve");
}

function hasRequiredRole(interaction) {
  if (!config.requiredRoleId) {
    return true;
  }

  const roleIds = interaction.member?.roles;
  if (!roleIds) {
    return false;
  }

  if (Array.isArray(roleIds)) {
    return roleIds.includes(config.requiredRoleId);
  }

  if (roleIds.cache) {
    return roleIds.cache.has(config.requiredRoleId);
  }

  return false;
}

async function getOrAssignCampaign(discordUserId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `
      SELECT c.code, c.invite_url
      FROM cc_assignments a
      JOIN cc_campaigns c ON c.id = a.campaign_id
      WHERE a.discord_user_id = $1
      LIMIT 1
      `,
      [discordUserId],
    );

    if (existing.rows.length > 0) {
      await client.query(
        `
        UPDATE cc_assignments
        SET last_requested_at = NOW()
        WHERE discord_user_id = $1
        `,
        [discordUserId],
      );
      await client.query(
        `
        INSERT INTO cc_audit_log (discord_user_id, action, metadata)
        VALUES ($1, 'reissued', '{}'::jsonb)
        `,
        [discordUserId],
      );
      await client.query("COMMIT");
      return existing.rows[0];
    }

    const assignment = await client.query(
      `
      WITH pick AS (
        SELECT c.id
        FROM cc_campaigns c
        LEFT JOIN cc_assignments a ON a.campaign_id = c.id
        WHERE c.active = true
        GROUP BY c.id
        ORDER BY COUNT(a.discord_user_id) ASC, c.id ASC
        LIMIT 1
      ),
      inserted AS (
        INSERT INTO cc_assignments (discord_user_id, campaign_id)
        SELECT $1, pick.id
        FROM pick
        RETURNING campaign_id
      )
      SELECT c.code, c.invite_url, c.id AS campaign_id
      FROM inserted i
      JOIN cc_campaigns c ON c.id = i.campaign_id
      `,
      [discordUserId],
    );

    if (assignment.rows.length === 0) {
      await client.query(
        `
        INSERT INTO cc_audit_log (discord_user_id, action, metadata)
        VALUES ($1, 'denied', '{"reason":"no_active_campaigns"}'::jsonb)
        `,
        [discordUserId],
      );
      await client.query("COMMIT");
      return null;
    }

    const picked = assignment.rows[0];
    await client.query(
      `
      INSERT INTO cc_audit_log (discord_user_id, action, campaign_id, metadata)
      VALUES ($1, 'issued', $2, '{}'::jsonb)
      `,
      [discordUserId, picked.campaign_id],
    );

    await client.query("COMMIT");
    return picked;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function buildMagicItemRarityRow(discordUserId, selectedRarity = null) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`magicitem:${discordUserId}`)
    .setPlaceholder("Select a rarity...")
    .addOptions(
      MAGIC_ITEM_RARITIES.map((rarity) => ({
        label: rarity.label,
        description: rarity.description,
        value: rarity.value,
        default: rarity.value === selectedRarity,
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

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

async function getRandomMagicItem(rarity) {
  const result = await pool.query(
    `
    WITH ranked_items AS (
      SELECT
        id,
        name,
        ROW_NUMBER() OVER (ORDER BY sort_order ASC, id ASC) AS roll_number,
        COUNT(*) OVER () AS total_count
      FROM magic_items
      WHERE rarity = $1
        AND is_published = true
    )
    SELECT
      name AS item_label,
      roll_number,
      total_count
    FROM ranked_items
    ORDER BY RANDOM()
    LIMIT 1
    `,
    [rarity],
  );

  return result.rows[0] ?? null;
}

function getMagicItemRarityTheme(rarityValue) {
  switch (rarityValue) {
    case "common":
      return {
        color: 0x9e9e9e,
        title: "Vault Lot Drawn",
        flavor:
          "From the lower cedar racks, the quartermaster produces a serviceable charm fit for a prepared traveler.",
      };
    case "uncommon":
      return {
        color: 0x43a047,
        title: "Vault Lot Drawn",
        flavor:
          "A brighter glimmer answers the summons as the vault yields a prize of uncommon merit.",
      };
    case "rare":
      return {
        color: 0x1e88e5,
        title: "Vault Lot Drawn",
        flavor:
          "The warded cabinets part and a rarer treasure is brought forth with due ceremony.",
      };
    case "veryrare":
      return {
        color: 0x8e24aa,
        title: "Vault Lot Drawn",
        flavor:
          "The deeper sigils awaken. What emerges is no ordinary relic, but a piece of notable power.",
      };
    case "legendary":
      return {
        color: 0xffb300,
        title: "Vault Lot Drawn",
        flavor:
          "Ancient wards answer the call, and the vault releases a treasure spoken of more often than seen.",
      };
    default:
      return {
        color: 0x607d8b,
        title: "Vault Lot Drawn",
        flavor: "The vault stirs and yields its chosen prize.",
      };
  }
}

function getDisplayName(interaction) {
  if (interaction.member && "displayName" in interaction.member) {
    return interaction.member.displayName;
  }

  return interaction.user.globalName || interaction.user.username;
}

function buildMagicItemResultEmbed({
  displayName,
  userMention,
  userAvatarUrl,
  rarity,
  rollNumber,
  totalCount,
  itemName,
}) {
  const theme = getMagicItemRarityTheme(rarity.value);

  return new EmbedBuilder()
    .setColor(theme.color)
    .setAuthor({
      name: displayName,
      iconURL: userAvatarUrl,
    })
    .setTitle(theme.title)
    .setDescription(
      `${theme.flavor}\n\nMarked claimant: ${userMention}`,
    )
    .addFields(
      { name: "Rarity", value: rarity.label, inline: true },
      { name: "Roll", value: `${rollNumber} / ${totalCount}`, inline: true },
      { name: "Item", value: `**${itemName}**` },
    )
    .setThumbnail(MAGIC_ITEM_RESULT_GIF_URL)
    .setFooter({ text: "The vault stands ready for the next draw." })
    .setTimestamp();
}

const bot = new Client({
  intents: [GatewayIntentBits.Guilds],
});

bot.once("ready", async () => {
  console.log(`Logged in as ${bot.user.tag}`);
  try {
    await registerGuildCommands();
  } catch (error) {
    console.error("Failed to register slash command:", error);
  }
});

bot.on("interactionCreate", async (interaction) => {
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId.startsWith("approve-category:")) {
      const ownerId = interaction.customId.slice("approve-category:".length);
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/approve` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      if (!hasRequiredRole(interaction)) {
        await interaction.reply({
          content: "You do not have the required role to approve homebrew.",
          ephemeral: true,
        });
        return;
      }

      const category = interaction.values[0];
      const categoryConfig = getCategory(category);

      if (!categoryConfig) {
        await interaction.reply({
          content: "That homebrew type is not supported.",
          ephemeral: true,
        });
        return;
      }

      if (categoryNeedsDetail(category)) {
        await interaction.update({
          content:
            category === "spells"
              ? "Choose the spell level."
              : "Choose the item rarity.",
          components: [buildApproveDetailRow(interaction.user.id, category)],
        });
        return;
      }

      await interaction.showModal(
        buildApproveModal(interaction.user.id, category),
      );
      return;
    }

    if (interaction.customId.startsWith("approve-detail:")) {
      const [, ownerId, category] = interaction.customId.split(":");
      if (ownerId !== interaction.user.id) {
        await interaction.reply({
          content: "Use your own `/approve` command so the menu belongs to you.",
          ephemeral: true,
        });
        return;
      }

      if (!hasRequiredRole(interaction)) {
        await interaction.reply({
          content: "You do not have the required role to approve homebrew.",
          ephemeral: true,
        });
        return;
      }

      const detailValue = interaction.values[0];
      if (!getApproveTarget(category, detailValue)) {
        await interaction.reply({
          content: "That approval option is not supported.",
          ephemeral: true,
        });
        return;
      }

      await interaction.showModal(
        buildApproveModal(interaction.user.id, category, detailValue),
      );
      return;
    }

    if (!interaction.customId.startsWith("magicitem:")) {
      return;
    }

    const ownerId = interaction.customId.slice("magicitem:".length);
    if (ownerId !== interaction.user.id) {
      await interaction.reply({
        content: "Use your own `/magicitem` command so the menu belongs to you.",
        ephemeral: true,
      });
      return;
    }

    try {
      const selectedRarity = interaction.values[0];
      const rarity = MAGIC_ITEM_RARITIES.find(
        (entry) => entry.value === selectedRarity,
      );

      if (!rarity) {
        await interaction.reply({
          content: "That rarity is not supported.",
          ephemeral: true,
        });
        return;
      }

      const item = await getRandomMagicItem(selectedRarity);
      if (!item) {
        await interaction.update({
          content:
            `No published magic items are available for **${rarity.label}** yet.`,
          components: [
            buildMagicItemRarityRow(interaction.user.id, selectedRarity),
          ],
        });
        return;
      }

      await interaction.update({
        content:
          `**${rarity.label} Magic Item:** ${item.item_label}\nUse the menu to roll again.`,
        components: [
          buildMagicItemRarityRow(interaction.user.id, selectedRarity),
        ],
      });

      try {
        const displayName = getDisplayName(interaction);
        await interaction.followUp({
          content: `${interaction.user}`,
          embeds: [
            buildMagicItemResultEmbed({
              displayName,
              userMention: interaction.user.toString(),
              userAvatarUrl: interaction.user.displayAvatarURL(),
              rarity,
              rollNumber: item.roll_number,
              totalCount: item.total_count,
              itemName: item.item_label,
            }),
          ],
          ephemeral: false,
          allowedMentions: {
            parse: [],
            users: [interaction.user.id],
          },
        });
      } catch (postError) {
        console.error("Failed to post public magic item result:", postError);
      }
    } catch (error) {
      console.error("Failed to process magic item select menu:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Something went wrong while rolling your magic item. Please try again.",
        );
      } else {
        await interaction.reply({
          content:
            "Something went wrong while rolling your magic item. Please try again.",
          ephemeral: true,
        });
      }
    }

    return;
  }

  if (interaction.isModalSubmit()) {
    if (!interaction.customId.startsWith("approve-modal:")) {
      return;
    }

    const [, ownerId, category, detailValue] = interaction.customId.split(":");
    if (ownerId !== interaction.user.id) {
      await interaction.reply({
        content: "Use your own `/approve` command so the form belongs to you.",
        ephemeral: true,
      });
      return;
    }

    if (!hasRequiredRole(interaction)) {
      await interaction.reply({
        content: "You do not have the required role to approve homebrew.",
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });

      const name = interaction.fields.getTextInputValue("homebrew-name");
      const url = interaction.fields.getTextInputValue("homebrew-url");
      const approval = await approveHomebrew({
        category,
        detailValue: detailValue === "none" ? "" : detailValue,
        name,
        url,
      });

      await interaction.editReply(
        approval.created
          ? `Approved **${approval.label}** under **${approval.title}**.\n${approval.href}`
          : `That homebrew was already listed under **${approval.title}** as **${approval.label}**.\n${approval.href}`,
      );

      if (approval.created && interaction.channel?.send) {
        try {
          await interaction.channel.send(
            buildApprovalAnnouncement(approval, interaction.user.toString()),
          );
        } catch (postError) {
          console.error("Failed to post /approve announcement:", postError);
          await interaction.followUp({
            content:
              "The homebrew was approved, but I could not post the public channel announcement.",
            ephemeral: true,
          });
        }
      }
    } catch (error) {
      console.error("Failed to process /approve modal:", error);
      const message =
        error instanceof TypeError
          ? "That URL is not valid. Please run `/approve` again with a full URL."
          : "Something went wrong while approving that homebrew. Please try again.";

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(message);
      } else {
        await interaction.reply({ content: message, ephemeral: true });
      }
    }

    return;
  }

  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (!interaction.inGuild() || interaction.guildId !== config.guildId) {
    await interaction.reply({
      content: "Use this command inside the server.",
      ephemeral: true,
    });
    return;
  }

  if (interaction.commandName === "magicitem") {
    await interaction.reply({
      content: "Choose a rarity to roll a random magic item.",
      components: [buildMagicItemRarityRow(interaction.user.id)],
      ephemeral: true,
    });
    return;
  }

  if (interaction.commandName === "approve") {
    if (!hasRequiredRole(interaction)) {
      await interaction.reply({
        content: "You do not have the required role to approve homebrew.",
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: "Choose the type of homebrew to approve.",
      components: [buildApproveCategoryRow(interaction.user.id)],
      ephemeral: true,
    });
    return;
  }

  if (interaction.commandName !== "cc-link") {
    return;
  }

  if (!hasRequiredRole(interaction)) {
    await interaction.reply({
      content: "You do not have the required role to request a CC link.",
      ephemeral: true,
    });
    return;
  }

  try {
    await interaction.deferReply({ ephemeral: true });

    const campaign = await getOrAssignCampaign(interaction.user.id);
    if (!campaign) {
      await interaction.editReply(
        "No active campaign links are currently available. Please contact staff.",
      );
      return;
    }

    await interaction.editReply(
      `Your assigned campaign is **${campaign.code}**.\nJoin link: ${campaign.invite_url}`,
    );
  } catch (error) {
    console.error("Failed to process /cc-link:", error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(
        "Something went wrong while fetching your link. Please try again.",
      );
    } else {
      await interaction.reply({
        content:
          "Something went wrong while fetching your link. Please try again.",
        ephemeral: true,
      });
    }
  }
});

bot.login(config.token);
