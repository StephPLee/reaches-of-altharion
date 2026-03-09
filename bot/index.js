const path = require("path");
const dotenv = require("dotenv");

// Support both project-root .env and bot/.env.
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, ".env") });

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
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
].map((command) => command.toJSON());

async function registerGuildCommands() {
  const rest = new REST({ version: "10" }).setToken(config.token);
  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commands },
  );
  console.log("Slash command registered: /cc-link");
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
  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (interaction.commandName !== "cc-link") {
    return;
  }

  if (!interaction.inGuild() || interaction.guildId !== config.guildId) {
    await interaction.reply({
      content: "Use this command inside the server.",
      ephemeral: true,
    });
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
