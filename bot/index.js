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
  REST,
  Routes,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
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

async function registerGuildCommands() {
  const rest = new REST({ version: "10" }).setToken(config.token);
  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commands },
  );
  console.log("Slash commands registered: /cc-link, /magicitem");
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

      if (interaction.channel) {
        const displayName = getDisplayName(interaction);
        await interaction.channel.send({
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
          allowedMentions: { users: [interaction.user.id] },
        });
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
