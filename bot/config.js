const path = require("path");
const dotenv = require("dotenv");

// Support both project-root .env and bot/.env.
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, ".env") });

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
  dmRoleId: process.env.DM_ROLE_ID || "",
  guildRosterChannelId: process.env.GUILD_ROSTER_CHANNEL_ID || "",
  bossStatusChannelId: process.env.BOSS_STATUS_CHANNEL_ID || "",
  beginnerRoleId:
    process.env.BEGINNER_ROLE_ID || "1417172430539063378",
  beginnerRoleChannelId: process.env.BEGINNER_ROLE_CHANNEL_ID || "",
  startingGracesChannelId: process.env.STARTING_GRACES_CHANNEL_ID || "",
  characterCreationChannelId: process.env.CHARACTER_CREATION_CHANNEL_ID || "",
  playerMarketplaceChannelId:
    process.env.PLAYER_MARKETPLACE_CHANNEL_ID || "1538175219695620207",
  publicSiteUrl: (
    process.env.PUBLIC_SITE_URL || "https://reachesofaltharion.com"
  ).replace(/\/$/, ""),
  westMarchesApiBaseUrl: (
    process.env.WEST_MARCHES_API_BASE_URL ||
    "https://www.westmarches.games/api/v1"
  ).replace(/\/$/, ""),
  westMarchesApiKey: process.env.WEST_MARCHES_API_KEY || "",
  westMarchesScCurrencyId: process.env.WEST_MARCHES_SC_CURRENCY_ID || "",
  craftingWorkshopsForumChannelId:
    process.env.CRAFTING_WORKSHOPS_FORUM_CHANNEL_ID || "",
  googleSheetsFeedbackWebhookUrl:
    process.env.GOOGLE_SHEETS_FEEDBACK_WEBHOOK_URL || "",
  googleSheetsFeedbackWebhookSecret:
    process.env.GOOGLE_SHEETS_FEEDBACK_WEBHOOK_SECRET || "",
};


module.exports = config;
