const path = require("path");
const dotenv = require("dotenv");

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, ".env") });

const requiredEnv = [
  "DISCORD_TOKEN",
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "DISCORD_GUILD_ID",
  "REQUIRED_ROLE_ID",
  "DATABASE_URL",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const isProduction = process.env.NODE_ENV === "production";
const appOrigin = process.env.APP_ORIGIN || "http://localhost:3000";
const appOriginUrl = new URL(appOrigin);
const cookieSecure =
  process.env.COOKIE_SECURE === "true"
    ? true
    : process.env.COOKIE_SECURE === "false"
      ? false
      : isProduction;
const sessionCookieSameSite =
  process.env.SESSION_COOKIE_SAME_SITE || (isProduction ? "none" : "lax");

if (!["lax", "strict", "none"].includes(sessionCookieSameSite)) {
  throw new Error(
    "SESSION_COOKIE_SAME_SITE must be one of: lax, strict, none.",
  );
}

if (appOriginUrl.protocol === "https:" && !cookieSecure) {
  throw new Error("COOKIE_SECURE must be true when APP_ORIGIN uses https.");
}

if (sessionCookieSameSite === "none" && !cookieSecure) {
  throw new Error(
    "COOKIE_SECURE must be true when SESSION_COOKIE_SAME_SITE is none.",
  );
}

const databaseSslMode = process.env.DATABASE_SSL_MODE || "require";
const databaseSslRejectUnauthorized =
  process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false" ? false : true;

if (isProduction && databaseSslMode === "disable") {
  throw new Error("DATABASE_SSL_MODE cannot be disable in production.");
}

module.exports = {
  appOrigin,
  appOriginUrl,
  cookieSecure,
  databaseSslMode,
  databaseSslRejectUnauthorized,
  databaseUrl: process.env.DATABASE_URL,
  discordBotToken: process.env.DISCORD_TOKEN,
  discordClientId: process.env.DISCORD_CLIENT_ID,
  discordClientSecret: process.env.DISCORD_CLIENT_SECRET,
  discordGuildId: process.env.DISCORD_GUILD_ID,
  calendarAnnouncementChannelId:
    process.env.CALENDAR_ANNOUNCEMENT_CHANNEL_ID || "",
  marketplaceChannelId: process.env.MARKETPLACE_CHANNEL_ID || "",
  marketplaceMessageId: process.env.MARKETPLACE_MESSAGE_ID || "",
  discordOauthRedirectUri:
    process.env.DISCORD_OAUTH_REDIRECT_URI ||
    "http://localhost:3001/auth/discord/callback",
  requiredRoleId: process.env.REQUIRED_ROLE_ID,
  dmRoleId: process.env.DM_ROLE_ID || "",
  isProduction,
  port: Number(process.env.PORT || process.env.SERVER_PORT || 3001),
  oauthStateCookieName:
    process.env.OAUTH_STATE_COOKIE_NAME || "roa_discord_oauth_state",
  oauthReturnToCookieName:
    process.env.OAUTH_RETURN_TO_COOKIE_NAME || "roa_discord_return_to",
  oauthStateTtlMinutes: Number(process.env.OAUTH_STATE_TTL_MINUTES || 10),
  staffRevalidationMinutes: Number(
    process.env.STAFF_REVALIDATION_MINUTES || 10,
  ),
  sessionCookieSameSite,
  sessionCookieName: process.env.SESSION_COOKIE_NAME || "roa_admin_session",
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS || 7),
  authRateLimitWindowMs: Number(
    process.env.AUTH_RATE_LIMIT_WINDOW_MS || 5 * 60 * 1000,
  ),
  authRateLimitMaxRequests: Number(
    process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || 30,
  ),
  authCallbackRateLimitMaxRequests: Number(
    process.env.AUTH_CALLBACK_RATE_LIMIT_MAX_REQUESTS || 15,
  ),
  sessionRateLimitWindowMs: Number(
    process.env.SESSION_RATE_LIMIT_WINDOW_MS || 60 * 1000,
  ),
  sessionRateLimitMaxRequests: Number(
    process.env.SESSION_RATE_LIMIT_MAX_REQUESTS || 60,
  ),
  adminRateLimitWindowMs: Number(
    process.env.ADMIN_RATE_LIMIT_WINDOW_MS || 60 * 1000,
  ),
  adminRateLimitMaxRequests: Number(
    process.env.ADMIN_RATE_LIMIT_MAX_REQUESTS || 120,
  ),
  westMarchesApiBaseUrl: (
    process.env.WEST_MARCHES_API_BASE_URL ||
    "https://www.westmarches.games/api/v1"
  ).replace(/\/$/, ""),
  westMarchesApiKey: process.env.WEST_MARCHES_API_KEY || "",
  westMarchesGoldCurrencyId: process.env.WEST_MARCHES_GOLD_CURRENCY_ID || "",
  westMarchesScCurrencyId: process.env.WEST_MARCHES_SC_CURRENCY_ID || "",
  westMarchesEventCurrencyName:
    process.env.WEST_MARCHES_EVENT_CURRENCY_NAME || "",
  westMarchesRewardChannelId: process.env.WEST_MARCHES_REWARD_CHANNEL_ID || "",
};
