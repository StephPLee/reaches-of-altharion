const express = require("express");
const { serialize, parse } = require("cookie");
const crypto = require("node:crypto");
const {
  appOrigin,
  appOriginUrl,
  adminRateLimitMaxRequests,
  adminRateLimitWindowMs,
  authCallbackRateLimitMaxRequests,
  authRateLimitMaxRequests,
  authRateLimitWindowMs,
  cookieSecure,
  isProduction,
  oauthReturnToCookieName,
  oauthStateCookieName,
  oauthStateTtlMinutes,
  port,
  requiredRoleId,
  dmRoleId,
  sessionRateLimitMaxRequests,
  sessionRateLimitWindowMs,
  sessionCookieSameSite,
  staffRevalidationMinutes,
  sessionCookieName,
  westMarchesGoldCurrencyId,
  westMarchesRewardChannelId,
  westMarchesScCurrencyId,
} = require("./config");
const { recordAuditEvent } = require("./audit");
const { pool } = require("./db");
const {
  createCalendarEvent,
  deleteCalendarEvent,
  listPublishedCalendarEvents,
  updateCalendarEvent,
} = require("./calendar");
const {
  createHomebrewItemAutomation,
  createHomebrewEntry,
  createHomebrewSectionItem,
  deleteHomebrewItemAutomation,
  deleteHomebrewSectionItem,
  listHomebrewEntriesBySection,
  updateHomebrewItemAutomation,
  updateHomebrewSectionItem,
} = require("./homebrew");
const {
  createGuild,
  createGuildUpgradeAutomation,
  createGuildUpgrade,
  deleteGuild,
  deleteGuildUpgradeAutomation,
  deleteGuildUpgrade,
  listGuilds,
  updateGuild,
  updateGuildUpgradeAutomation,
  updateGuildUpgrade,
} = require("./guilds");
const {
  createStartingGrace,
  createStartingGraceAutomation,
  deleteStartingGrace,
  deleteStartingGraceAutomation,
  listStartingGraces,
  updateStartingGrace,
  updateStartingGraceAutomation,
} = require("./starting-graces");
const {
  createBoon,
  createBoonAutomation,
  deleteBoon,
  deleteBoonAutomation,
  listBoons,
  updateBoon,
  updateBoonAutomation,
} = require("./boons");
const {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  fetchDiscordUser,
  fetchGuildMember,
  memberHasRole,
  postChannelMessage,
} = require("./discord");
const {
  createSession,
  deleteExpiredSessions,
  deleteSession,
  deleteSessionsForUser,
  getSessionUser,
  upsertUser,
  updateUserRoleStatus,
} = require("./sessions");
const {
  distributeReward,
  getCharacter,
  isWestMarchesConfigured,
  listAllCharacters,
  listCurrencies,
} = require("./westmarches");

const app = express();
const rateLimitBuckets = new Map();

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", appOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,DELETE,OPTIONS",
  );

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

function getSessionTokenFromRequest(req) {
  return parse(req.headers.cookie || "")[sessionCookieName] || "";
}

function getOauthStateFromRequest(req) {
  return parse(req.headers.cookie || "")[oauthStateCookieName] || "";
}

function getOauthReturnToFromRequest(req) {
  return parse(req.headers.cookie || "")[oauthReturnToCookieName] || "";
}

function setSessionCookie(res, session) {
  const serializedCookie = serialize(sessionCookieName, session.token, {
    httpOnly: true,
    sameSite: sessionCookieSameSite,
    secure: cookieSecure,
    path: "/",
    expires: session.expiresAt,
  });
  res.setHeader("Set-Cookie", serializedCookie);
}

function buildOauthStateCookie(state, expires) {
  return serialize(oauthStateCookieName, state, {
    httpOnly: true,
    sameSite: sessionCookieSameSite,
    secure: cookieSecure,
    path: "/",
    expires,
  });
}

function buildOauthReturnToCookie(returnTo, expires) {
  return serialize(oauthReturnToCookieName, returnTo, {
    httpOnly: true,
    sameSite: sessionCookieSameSite,
    secure: cookieSecure,
    path: "/",
    expires,
  });
}

function clearOauthStateCookie(res) {
  appendSetCookieHeader(res, buildOauthStateCookie("", new Date(0)));
}

function clearOauthReturnToCookie(res) {
  appendSetCookieHeader(res, buildOauthReturnToCookie("", new Date(0)));
}

function clearSessionCookie(res) {
  appendSetCookieHeader(
    res,
    serialize(sessionCookieName, "", {
      httpOnly: true,
      sameSite: sessionCookieSameSite,
      secure: cookieSecure,
      path: "/",
      expires: new Date(0),
    }),
  );
}

function appendSetCookieHeader(res, cookieValue) {
  const existingHeader = res.getHeader("Set-Cookie");
  if (!existingHeader) {
    res.setHeader("Set-Cookie", cookieValue);
    return;
  }

  const headers = Array.isArray(existingHeader)
    ? [...existingHeader, cookieValue]
    : [existingHeader, cookieValue];
  res.setHeader("Set-Cookie", headers);
}

function normalizeReturnToPath(value) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return "/?view=map";
  }

  if (value.startsWith("//")) {
    return "/?view=map";
  }

  return value;
}

function buildAuthRedirectUrl(returnToPath, authErrorCode) {
  const redirectUrl = new URL(returnToPath, appOrigin);
  redirectUrl.searchParams.set("authError", authErrorCode);
  return redirectUrl.toString();
}

function redirectWithAuthError(req, res, authErrorCode) {
  const returnTo = normalizeReturnToPath(getOauthReturnToFromRequest(req));
  clearOauthStateCookie(res);
  clearOauthReturnToCookie(res);
  clearSessionCookie(res);
  res.redirect(buildAuthRedirectUrl(returnTo, authErrorCode));
}

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
    req.socket.remoteAddress ||
    null
  );
}

function getRequestMetadata(req) {
  return {
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"] || null,
  };
}

function createRateLimiter({ windowMs, maxRequests, keyPrefix }) {
  return (req, res, next) => {
    const ip = getClientIp(req) || "unknown";
    const bucketKey = `${keyPrefix}:${ip}`;
    const now = Date.now();
    const current = rateLimitBuckets.get(bucketKey);

    if (!current || current.expiresAt <= now) {
      rateLimitBuckets.set(bucketKey, {
        count: 1,
        expiresAt: now + windowMs,
      });
      next();
      return;
    }

    if (current.count >= maxRequests) {
      res.setHeader(
        "Retry-After",
        Math.max(1, Math.ceil((current.expiresAt - now) / 1000)),
      );
      res.status(429).json({ error: "Too many requests. Try again later." });
      return;
    }

    current.count += 1;
    next();
  };
}

const authRateLimiter = createRateLimiter({
  windowMs: authRateLimitWindowMs,
  maxRequests: authRateLimitMaxRequests,
  keyPrefix: "auth",
});

const authCallbackRateLimiter = createRateLimiter({
  windowMs: authRateLimitWindowMs,
  maxRequests: authCallbackRateLimitMaxRequests,
  keyPrefix: "auth-callback",
});

const sessionRateLimiter = createRateLimiter({
  windowMs: sessionRateLimitWindowMs,
  maxRequests: sessionRateLimitMaxRequests,
  keyPrefix: "session",
});

const adminRateLimiter = createRateLimiter({
  windowMs: adminRateLimitWindowMs,
  maxRequests: adminRateLimitMaxRequests,
  keyPrefix: "admin",
});

setInterval(
  () => {
    const now = Date.now();
    for (const [bucketKey, bucket] of rateLimitBuckets.entries()) {
      if (bucket.expiresAt <= now) {
        rateLimitBuckets.delete(bucketKey);
      }
    }
  },
  5 * 60 * 1000,
).unref();

function requireTrustedOrigin(req, res, next) {
  if (
    req.method === "GET" ||
    req.method === "HEAD" ||
    req.method === "OPTIONS"
  ) {
    next();
    return;
  }

  const originHeader = req.headers.origin;

  if (!originHeader) {
    res.status(403).json({ error: "Missing Origin header." });
    return;
  }

  let originUrl;
  try {
    originUrl = new URL(originHeader);
  } catch {
    res.status(403).json({ error: "Invalid Origin header." });
    return;
  }

  if (originUrl.origin !== appOriginUrl.origin) {
    res.status(403).json({ error: "Untrusted request origin." });
    return;
  }

  next();
}

async function revalidateStaffUser(user) {
  const lastCheckTimestamp = user.lastGuildCheckAt
    ? new Date(user.lastGuildCheckAt).getTime()
    : 0;
  const revalidationWindowMs = staffRevalidationMinutes * 60 * 1000;

  if (Date.now() - lastCheckTimestamp <= revalidationWindowMs) {
    return user;
  }

  const guildMember = await fetchGuildMember(user.discordUserId);
  const isStaff = memberHasRole(guildMember, requiredRoleId);
  const isDm = dmRoleId ? memberHasRole(guildMember, dmRoleId) : false;

  await updateUserRoleStatus({
    discordUserId: user.discordUserId,
    isStaff,
    isDm,
  });

  return {
    ...user,
    isStaff: Boolean(guildMember) && isStaff,
    isDm: Boolean(guildMember) && isDm,
    lastGuildCheckAt: new Date(),
  };
}

app.get("/health", async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true });
});

app.get("/auth/discord/login", authRateLimiter, (req, res) => {
  const state = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + oauthStateTtlMinutes * 60 * 1000);
  const returnTo = normalizeReturnToPath(
    typeof req.query.returnTo === "string" ? req.query.returnTo : "",
  );
  res.setHeader("Set-Cookie", [
    buildOauthStateCookie(state, expires),
    buildOauthReturnToCookie(returnTo, expires),
  ]);
  res.redirect(buildAuthorizationUrl(state));
});

app.get("/auth/discord/callback", authCallbackRateLimiter, async (req, res) => {
  const { code, error, state } = req.query;
  const requestMetadata = getRequestMetadata(req);

  if (error) {
    await recordAuditEvent({
      action: "discord_login",
      status: "denied",
      metadata: { reason: "discord_error", error },
      ...requestMetadata,
    });
    redirectWithAuthError(req, res, "discord_denied");
    return;
  }

  if (typeof code !== "string" || !code) {
    await recordAuditEvent({
      action: "discord_login",
      status: "denied",
      metadata: { reason: "missing_code" },
      ...requestMetadata,
    });
    redirectWithAuthError(req, res, "discord_denied");
    return;
  }

  const storedState = getOauthStateFromRequest(req);
  if (
    typeof state !== "string" ||
    !state ||
    !storedState ||
    state !== storedState
  ) {
    await recordAuditEvent({
      action: "discord_login",
      status: "denied",
      metadata: { reason: "invalid_state" },
      ...requestMetadata,
    });
    redirectWithAuthError(req, res, "login_failed");
    return;
  }

  try {
    const tokenResponse = await exchangeCodeForToken(code);
    const discordUser = await fetchDiscordUser(tokenResponse.access_token);
    const guildMember = await fetchGuildMember(discordUser.id);

    if (!guildMember) {
      await recordAuditEvent({
        action: "discord_login",
        status: "denied",
        discordUserId: discordUser.id,
        metadata: { reason: "not_in_guild" },
        ...requestMetadata,
      });
      redirectWithAuthError(req, res, "not_in_server");
      return;
    }

    const isStaff = memberHasRole(guildMember, requiredRoleId);
    const isDm = dmRoleId ? memberHasRole(guildMember, dmRoleId) : false;
    if (!isStaff && !isDm) {
      const deniedUser = await upsertUser({
        discordUser,
        isStaff: false,
        isDm: false,
      });
      await recordAuditEvent({
        action: "discord_login",
        status: "denied",
        userId: deniedUser.id,
        discordUserId: discordUser.id,
        metadata: { reason: "missing_staff_role" },
        ...requestMetadata,
      });
      redirectWithAuthError(req, res, "staff_only");
      return;
    }

    const user = await upsertUser({ discordUser, isStaff, isDm });
    const session = await createSession(user.id);
    const returnTo = normalizeReturnToPath(getOauthReturnToFromRequest(req));

    setSessionCookie(res, session);
    clearOauthStateCookie(res);
    clearOauthReturnToCookie(res);
    await recordAuditEvent({
      action: "discord_login",
      status: "success",
      userId: user.id,
      discordUserId: discordUser.id,
      metadata: {
        sessionExpiresAt: session.expiresAt.toISOString(),
      },
      ...requestMetadata,
    });
    res.redirect(`${appOrigin}${returnTo}`);
  } catch (authError) {
    console.error("Discord auth callback failed:", authError);
    await recordAuditEvent({
      action: "discord_login",
      status: "error",
      metadata: { reason: "callback_exception" },
      ...requestMetadata,
    });
    redirectWithAuthError(req, res, "login_failed");
  }
});

async function requireStaffSession(req, res, next) {
  try {
    const sessionToken = getSessionTokenFromRequest(req);
    const user = await getSessionUser(sessionToken);

    if (!user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const revalidatedUser = await revalidateStaffUser(user);

    if (!revalidatedUser.isStaff) {
      await deleteSessionsForUser(user.id);
      clearSessionCookie(res);
      await recordAuditEvent({
        action: "staff_revalidation",
        status: "denied",
        userId: user.id,
        discordUserId: user.discordUserId,
        metadata: { reason: "staff_role_missing_on_revalidation" },
        ...getRequestMetadata(req),
      });
      res.status(403).json({ error: "Staff role required." });
      return;
    }

    req.staffUser = revalidatedUser;
    next();
  } catch (sessionError) {
    console.error("Staff session check failed:", sessionError);
    res.status(500).json({ error: "Failed to verify staff session." });
  }
}

async function requireRewardSubmitSession(req, res, next) {
  try {
    const sessionToken = getSessionTokenFromRequest(req);
    const user = await getSessionUser(sessionToken);

    if (!user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const revalidatedUser = await revalidateStaffUser(user);

    if (!revalidatedUser.isStaff && !revalidatedUser.isDm) {
      await deleteSessionsForUser(user.id);
      clearSessionCookie(res);
      await recordAuditEvent({
        action: "reward_submit_revalidation",
        status: "denied",
        userId: user.id,
        discordUserId: user.discordUserId,
        metadata: { reason: "reward_role_missing_on_revalidation" },
        ...getRequestMetadata(req),
      });
      res.status(403).json({ error: "DM or staff role required." });
      return;
    }

    req.staffUser = revalidatedUser;
    next();
  } catch (sessionError) {
    console.error("Reward submit session check failed:", sessionError);
    res.status(500).json({ error: "Failed to verify reward submit session." });
  }
}

app.use(
  "/api/admin",
  requireTrustedOrigin,
  adminRateLimiter,
  requireStaffSession,
);

function slugifyCalendarTitle(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeHomebrewAutomationPayload(body) {
  const {
    homebrewEntryId,
    homebrewSectionItemId,
    panelTitle,
    panelSubtitle,
    setupCommands,
    codeBlocks,
  } = body ?? {};

  if (
    !Number.isInteger(homebrewEntryId) ||
    homebrewEntryId <= 0 ||
    !Number.isInteger(homebrewSectionItemId) ||
    homebrewSectionItemId <= 0
  ) {
    return { error: "Valid item and entry ids are required." };
  }

  const normalizedSetupCommands = Array.isArray(setupCommands)
    ? setupCommands
        .filter(
          (command) =>
            command &&
            typeof command.command === "string" &&
            command.command.trim(),
        )
        .map((command) => ({
          label:
            typeof command.label === "string" && command.label.trim()
              ? command.label.trim()
              : "Required CC",
          command: command.command.trim(),
        }))
    : [];

  const normalizedCodeBlocks = Array.isArray(codeBlocks)
    ? codeBlocks
        .filter(
          (codeBlock) =>
            codeBlock &&
            typeof codeBlock.title === "string" &&
            codeBlock.title.trim() &&
            typeof codeBlock.code === "string" &&
            codeBlock.code.trim(),
        )
        .map((codeBlock) => ({
          title: codeBlock.title.trim(),
          code: codeBlock.code,
          downloadName:
            typeof codeBlock.downloadName === "string" &&
            codeBlock.downloadName.trim()
              ? codeBlock.downloadName.trim()
              : `${codeBlock.title
                  .trim()
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")}.txt`,
        }))
    : [];

  if (
    normalizedSetupCommands.length === 0 &&
    normalizedCodeBlocks.length === 0
  ) {
    return { error: "Add at least one setup command or code block." };
  }

  return {
    homebrewEntryId,
    homebrewSectionItemId,
    panelTitle:
      typeof panelTitle === "string" && panelTitle.trim()
        ? panelTitle.trim()
        : "Avrae Automation",
    panelSubtitle:
      typeof panelSubtitle === "string" && panelSubtitle.trim()
        ? panelSubtitle.trim()
        : "Expand to view setup and download options",
    setupCommands: normalizedSetupCommands,
    codeBlocks: normalizedCodeBlocks,
  };
}

function normalizeGuildUpgradeAutomationPayload(body) {
  const {
    guildUpgradeId,
    panelTitle,
    panelSubtitle,
    setupCommands,
    codeBlocks,
  } = body ?? {};

  if (!Number.isInteger(guildUpgradeId) || guildUpgradeId <= 0) {
    return { error: "Valid guild upgrade id is required." };
  }

  const normalizedSetupCommands = Array.isArray(setupCommands)
    ? setupCommands
        .filter(
          (command) =>
            command &&
            typeof command.command === "string" &&
            command.command.trim(),
        )
        .map((command) => ({
          label:
            typeof command.label === "string" && command.label.trim()
              ? command.label.trim()
              : "Required CC",
          command: command.command.trim(),
        }))
    : [];

  const normalizedCodeBlocks = Array.isArray(codeBlocks)
    ? codeBlocks
        .filter(
          (codeBlock) =>
            codeBlock &&
            typeof codeBlock.title === "string" &&
            codeBlock.title.trim() &&
            typeof codeBlock.code === "string" &&
            codeBlock.code.trim(),
        )
        .map((codeBlock) => ({
          title: codeBlock.title.trim(),
          code: codeBlock.code,
          downloadName:
            typeof codeBlock.downloadName === "string" &&
            codeBlock.downloadName.trim()
              ? codeBlock.downloadName.trim()
              : `${codeBlock.title
                  .trim()
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")}.txt`,
        }))
    : [];

  if (
    normalizedSetupCommands.length === 0 &&
    normalizedCodeBlocks.length === 0
  ) {
    return { error: "Add at least one setup command or code block." };
  }

  return {
    guildUpgradeId,
    panelTitle:
      typeof panelTitle === "string" && panelTitle.trim()
        ? panelTitle.trim()
        : "Avrae Automation",
    panelSubtitle:
      typeof panelSubtitle === "string" && panelSubtitle.trim()
        ? panelSubtitle.trim()
        : "Expand to view setup and download options",
    setupCommands: normalizedSetupCommands,
    codeBlocks: normalizedCodeBlocks,
  };
}

function normalizeStartingGraceAutomationPayload(body) {
  const {
    startingGraceId,
    panelTitle,
    panelSubtitle,
    setupCommands,
    codeBlocks,
  } = body ?? {};

  if (!Number.isInteger(startingGraceId) || startingGraceId <= 0) {
    return { error: "Valid starting grace id is required." };
  }

  const normalizedSetupCommands = Array.isArray(setupCommands)
    ? setupCommands
        .filter(
          (command) =>
            command &&
            typeof command.command === "string" &&
            command.command.trim(),
        )
        .map((command) => ({
          label:
            typeof command.label === "string" && command.label.trim()
              ? command.label.trim()
              : "Required CC",
          command: command.command.trim(),
        }))
    : [];

  const normalizedCodeBlocks = Array.isArray(codeBlocks)
    ? codeBlocks
        .filter(
          (codeBlock) =>
            codeBlock &&
            typeof codeBlock.title === "string" &&
            codeBlock.title.trim() &&
            typeof codeBlock.code === "string" &&
            codeBlock.code.trim(),
        )
        .map((codeBlock) => ({
          title: codeBlock.title.trim(),
          code: codeBlock.code,
          downloadName:
            typeof codeBlock.downloadName === "string" &&
            codeBlock.downloadName.trim()
              ? codeBlock.downloadName.trim()
              : `${codeBlock.title
                  .trim()
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")}.txt`,
        }))
    : [];

  if (
    normalizedSetupCommands.length === 0 &&
    normalizedCodeBlocks.length === 0
  ) {
    return { error: "Add at least one setup command or code block." };
  }

  return {
    startingGraceId,
    panelTitle:
      typeof panelTitle === "string" && panelTitle.trim()
        ? panelTitle.trim()
        : "Avrae Automation",
    panelSubtitle:
      typeof panelSubtitle === "string" && panelSubtitle.trim()
        ? panelSubtitle.trim()
        : "Expand to view setup and download options",
    setupCommands: normalizedSetupCommands,
    codeBlocks: normalizedCodeBlocks,
  };
}

function normalizeBoonAutomationPayload(body) {
  const { boonId, panelTitle, panelSubtitle, setupCommands, codeBlocks } =
    body ?? {};

  if (!Number.isInteger(boonId) || boonId <= 0) {
    return { error: "Valid boon id is required." };
  }

  const normalizedSetupCommands = Array.isArray(setupCommands)
    ? setupCommands
        .filter(
          (command) =>
            command &&
            typeof command.command === "string" &&
            command.command.trim(),
        )
        .map((command) => ({
          label:
            typeof command.label === "string" && command.label.trim()
              ? command.label.trim()
              : "Required CC",
          command: command.command.trim(),
        }))
    : [];

  const normalizedCodeBlocks = Array.isArray(codeBlocks)
    ? codeBlocks
        .filter(
          (codeBlock) =>
            codeBlock &&
            typeof codeBlock.title === "string" &&
            codeBlock.title.trim() &&
            typeof codeBlock.code === "string" &&
            codeBlock.code.trim(),
        )
        .map((codeBlock) => ({
          title: codeBlock.title.trim(),
          code: codeBlock.code,
          downloadName:
            typeof codeBlock.downloadName === "string" &&
            codeBlock.downloadName.trim()
              ? codeBlock.downloadName.trim()
              : `${codeBlock.title
                  .trim()
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")}.txt`,
        }))
    : [];

  if (
    normalizedSetupCommands.length === 0 &&
    normalizedCodeBlocks.length === 0
  ) {
    return { error: "Add at least one setup command or code block." };
  }

  return {
    boonId,
    panelTitle:
      typeof panelTitle === "string" && panelTitle.trim()
        ? panelTitle.trim()
        : "Avrae Automation",
    panelSubtitle:
      typeof panelSubtitle === "string" && panelSubtitle.trim()
        ? panelSubtitle.trim()
        : "Expand to view setup and download options",
    setupCommands: normalizedSetupCommands,
    codeBlocks: normalizedCodeBlocks,
  };
}

function parseOptionalWholeNumber(value) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.trunc(value);
}

function normalizeWestMarchesRewardPayload(body) {
  const { characterId, experience, gold, sc, reason, discordId } = body ?? {};

  if (typeof characterId !== "string" || !characterId.trim()) {
    return { error: "characterId is required." };
  }

  const normalizedExperience = parseOptionalWholeNumber(experience);
  const normalizedGold = parseOptionalWholeNumber(gold);
  const normalizedSc = parseOptionalWholeNumber(sc);

  if (
    normalizedExperience === null ||
    normalizedGold === null ||
    normalizedSc === null
  ) {
    return {
      error: "experience, gold, and sc must be whole numbers when provided.",
    };
  }

  if (normalizedExperience < 0 || normalizedGold < 0 || normalizedSc < 0) {
    return { error: "Reward values cannot be negative." };
  }

  if (
    normalizedExperience === 0 &&
    normalizedGold === 0 &&
    normalizedSc === 0
  ) {
    return { error: "At least one reward value must be greater than zero." };
  }

  const currencies = {};

  if (normalizedGold > 0) {
    if (!westMarchesGoldCurrencyId) {
      return {
        error:
          "WEST_MARCHES_GOLD_CURRENCY_ID is required to award gold rewards.",
      };
    }
    currencies[westMarchesGoldCurrencyId] = normalizedGold;
  }

  if (normalizedSc > 0) {
    if (!westMarchesScCurrencyId) {
      return {
        error: "WEST_MARCHES_SC_CURRENCY_ID is required to award SC rewards.",
      };
    }
    currencies[westMarchesScCurrencyId] = normalizedSc;
  }

  return {
    characterId: characterId.trim(),
    reward: {
      ...(normalizedExperience > 0 ? { experience: normalizedExperience } : {}),
      ...(Object.keys(currencies).length > 0 ? { currencies } : {}),
      reason:
        typeof reason === "string" && reason.trim()
          ? reason.trim().slice(0, 500)
          : "Rewards calculator submission",
      ...(typeof discordId === "string" && discordId.trim()
        ? { discordId: discordId.trim() }
        : {}),
    },
  };
}

function normalizeWestMarchesRewardBatchPayload(body) {
  const { characterIds, experience, gold, sc, reason } = body ?? {};

  if (
    !Array.isArray(characterIds) ||
    characterIds.length === 0 ||
    characterIds.some(
      (characterId) => typeof characterId !== "string" || !characterId.trim(),
    )
  ) {
    return {
      error: "characterIds must contain at least one valid character id.",
    };
  }

  const firstCharacterId = characterIds[0].trim();
  const normalizedSinglePayload = normalizeWestMarchesRewardPayload({
    characterId: firstCharacterId,
    experience,
    gold,
    sc,
    reason,
  });

  if (normalizedSinglePayload.error) {
    return normalizedSinglePayload;
  }

  return {
    characterIds: [
      ...new Set(characterIds.map((characterId) => characterId.trim())),
    ],
    reward: normalizedSinglePayload.reward,
  };
}

function formatRewardAmount(value) {
  return `+${new Intl.NumberFormat("en-GB").format(value)}`;
}

function buildRewardCharacterLine(character) {
  const name =
    typeof character?.name === "string" && character.name.trim()
      ? character.name.trim()
      : character?.id || "Unknown character";
  const discordId = character?.user?.discordId;

  return discordId ? `${name} <@${discordId}>` : name;
}

function truncateEmbedFieldValue(value) {
  if (value.length <= 1024) {
    return value;
  }

  return `${value.slice(0, 1021)}...`;
}

function buildRewardChannelPayload({ characters, rewardRequest, staffUser }) {
  const submittedBy =
    staffUser.globalName?.trim() || staffUser.username || "Unknown staff";
  const characterLines = characters.map(buildRewardCharacterLine);
  const mentionIds = [
    ...new Set(
      characters
        .map((character) => character?.user?.discordId)
        .filter((discordId) => typeof discordId === "string" && discordId),
    ),
  ];
  const fields = [
    {
      name: "Characters",
      value: truncateEmbedFieldValue(characterLines.join("\n") || "Unknown"),
      inline: false,
    },
  ];

  if (
    typeof rewardRequest.experience === "number" &&
    rewardRequest.experience > 0
  ) {
    fields.push({
      name: "Exp",
      value: formatRewardAmount(rewardRequest.experience),
      inline: true,
    });
  }

  if (
    rewardRequest.currencies &&
    typeof rewardRequest.currencies === "object" &&
    westMarchesGoldCurrencyId &&
    typeof rewardRequest.currencies[westMarchesGoldCurrencyId] === "number"
  ) {
    fields.push({
      name: "Gold",
      value: formatRewardAmount(
        rewardRequest.currencies[westMarchesGoldCurrencyId],
      ),
      inline: true,
    });
  }

  if (
    rewardRequest.currencies &&
    typeof rewardRequest.currencies === "object" &&
    westMarchesScCurrencyId &&
    typeof rewardRequest.currencies[westMarchesScCurrencyId] === "number"
  ) {
    fields.push({
      name: "Stellar Coins",
      value: formatRewardAmount(
        rewardRequest.currencies[westMarchesScCurrencyId],
      ),
      inline: true,
    });
  }

  fields.push({
    name: "Reason",
    value: truncateEmbedFieldValue(
      rewardRequest.reason || "Rewards calculator submission",
    ),
    inline: false,
  });

  return {
    embeds: [
      {
        title: "Rewards Distributed",
        color: 0x4aa3ff,
        fields,
        footer: {
          text: `Submitted by ${submittedBy}`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
    allowed_mentions: {
      parse: [],
      users: mentionIds,
    },
  };
}

async function notifyRewardChannel({ characterIds, rewardRequest, staffUser }) {
  if (!westMarchesRewardChannelId) {
    return;
  }

  const characters = await Promise.all(
    characterIds.map(async (characterId) => {
      try {
        return await getCharacter(characterId);
      } catch (characterError) {
        console.warn(
          "Failed to load West Marches character for Discord notification:",
          characterError,
        );
        return { id: characterId, name: characterId, user: null };
      }
    }),
  );

  await postChannelMessage(
    westMarchesRewardChannelId,
    buildRewardChannelPayload({
      characters,
      rewardRequest,
      staffUser,
    }),
  );
}

app.get("/api/calendar", async (_req, res) => {
  try {
    const events = await listPublishedCalendarEvents();
    res.json({ events });
  } catch (calendarError) {
    console.error("Failed to load calendar events:", calendarError);
    res.status(500).json({ error: "Failed to load calendar events." });
  }
});

app.get("/api/homebrew/:section", async (req, res) => {
  const section =
    typeof req.params.section === "string" ? req.params.section.trim() : "";

  if (!section) {
    res.status(400).json({ error: "Section is required." });
    return;
  }

  try {
    const entries = await listHomebrewEntriesBySection(section);
    res.json({ entries });
  } catch (homebrewError) {
    console.error("Failed to load homebrew entries:", homebrewError);
    res.status(500).json({ error: "Failed to load homebrew entries." });
  }
});

app.get("/api/guilds", async (_req, res) => {
  try {
    const guilds = await listGuilds();
    res.json({ guilds });
  } catch (guildError) {
    console.error("Failed to load guilds:", guildError);
    res.status(500).json({ error: "Failed to load guilds." });
  }
});

app.get("/api/boons", async (_req, res) => {
  try {
    const boons = await listBoons();
    res.json({ boons });
  } catch (boonError) {
    console.error("Failed to load boons:", boonError);
    res.status(500).json({ error: "Failed to load boons." });
  }
});

app.get("/api/starting-graces", async (_req, res) => {
  try {
    const graces = await listStartingGraces();
    res.json({ graces });
  } catch (graceError) {
    console.error("Failed to load starting graces:", graceError);
    res.status(500).json({ error: "Failed to load starting graces." });
  }
});

app.get(
  "/api/rewards/westmarches/status",
  requireTrustedOrigin,
  requireRewardSubmitSession,
  async (_req, res) => {
    res.json({
      configured: isWestMarchesConfigured(),
      currencyMappings: {
        gold: westMarchesGoldCurrencyId || null,
        sc: westMarchesScCurrencyId || null,
      },
    });
  },
);

app.get(
  "/api/rewards/westmarches/characters",
  requireTrustedOrigin,
  requireRewardSubmitSession,
  async (req, res) => {
    if (!isWestMarchesConfigured()) {
      res.status(503).json({ error: "West Marches API is not configured." });
      return;
    }

    try {
      const query =
        typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
      const characters = await listAllCharacters();
      const filteredCharacters = query
        ? characters.filter((character) => {
            const haystack = [
              character?.name,
              character?.id,
              character?.user?.discordId,
              character?.user?.id,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            return haystack.includes(query);
          })
        : characters;

      res.json({
        characters: filteredCharacters
          .filter(
            (character) =>
              typeof character?.status !== "string" ||
              character.status.toUpperCase() !== "RETIRED",
          )
          .map((character) => ({
            id: character.id,
            name:
              typeof character.name === "string" ? character.name.trim() : "",
            level: character.level,
            experience: character.experience,
            status: character.status,
            image: character.image,
            user: character.user || null,
          })),
      });
    } catch (westMarchesError) {
      console.error(
        "Failed to load West Marches characters:",
        westMarchesError,
      );
      res.status(westMarchesError.status || 500).json({
        error:
          westMarchesError instanceof Error
            ? westMarchesError.message
            : "Failed to load West Marches characters.",
      });
    }
  },
);

app.get(
  "/api/rewards/westmarches/currencies",
  requireTrustedOrigin,
  requireRewardSubmitSession,
  async (_req, res) => {
    if (!isWestMarchesConfigured()) {
      res.status(503).json({ error: "West Marches API is not configured." });
      return;
    }

    try {
      const currencies = await listCurrencies();
      res.json({ currencies });
    } catch (westMarchesError) {
      console.error(
        "Failed to load West Marches currencies:",
        westMarchesError,
      );
      res.status(westMarchesError.status || 500).json({
        error:
          westMarchesError instanceof Error
            ? westMarchesError.message
            : "Failed to load West Marches currencies.",
      });
    }
  },
);

app.get(
  "/api/admin/westmarches/debug",
  requireStaffSession,
  async (_req, res) => {
    if (!isWestMarchesConfigured()) {
      res.status(503).json({ error: "West Marches API is not configured." });
      return;
    }

    try {
      const [currencies, characters] = await Promise.all([
        listCurrencies(),
        listAllCharacters(),
      ]);

      res.json({
        configured: true,
        currencyMappings: {
          gold: westMarchesGoldCurrencyId || null,
          sc: westMarchesScCurrencyId || null,
        },
        currencies,
        charactersSample: characters.slice(0, 25),
        characterCount: characters.length,
      });
    } catch (westMarchesError) {
      console.error(
        "Failed to load West Marches debug payload:",
        westMarchesError,
      );
      res.status(westMarchesError.status || 500).json({
        error:
          westMarchesError instanceof Error
            ? westMarchesError.message
            : "Failed to load West Marches debug payload.",
      });
    }
  },
);

app.post(
  "/api/rewards/westmarches/rewards/batch",
  requireTrustedOrigin,
  requireRewardSubmitSession,
  async (req, res) => {
    if (!isWestMarchesConfigured()) {
      res.status(503).json({ error: "West Marches API is not configured." });
      return;
    }

    const normalizedPayload = normalizeWestMarchesRewardBatchPayload(req.body);
    if (normalizedPayload.error) {
      res.status(400).json({ error: normalizedPayload.error });
      return;
    }

    try {
      const rewards = await Promise.all(
        normalizedPayload.characterIds.map((characterId) =>
          distributeReward({
            characterId,
            reward: normalizedPayload.reward,
          }),
        ),
      );

      if (westMarchesRewardChannelId) {
        try {
          await notifyRewardChannel({
            characterIds: normalizedPayload.characterIds,
            rewardRequest: normalizedPayload.reward,
            staffUser: req.staffUser,
          });
        } catch (notificationError) {
          console.error(
            "Failed to post reward batch notification to Discord:",
            notificationError,
          );
        }
      }

      await recordAuditEvent({
        action: "westmarches_reward_distribute_batch",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          characterIds: normalizedPayload.characterIds,
          rewards,
        },
        ...getRequestMetadata(req),
      });

      res.status(201).json({ rewards });
    } catch (westMarchesError) {
      console.error(
        "Failed to distribute West Marches reward batch:",
        westMarchesError,
      );

      await recordAuditEvent({
        action: "westmarches_reward_distribute_batch",
        status: "error",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          characterIds: normalizedPayload.characterIds,
          error:
            westMarchesError instanceof Error
              ? westMarchesError.message
              : "unknown_error",
        },
        ...getRequestMetadata(req),
      });

      res.status(westMarchesError.status || 500).json({
        error:
          westMarchesError instanceof Error
            ? westMarchesError.message
            : "Failed to distribute reward batch.",
      });
    }
  },
);

app.post(
  "/api/rewards/westmarches/rewards",
  requireTrustedOrigin,
  requireRewardSubmitSession,
  async (req, res) => {
    if (!isWestMarchesConfigured()) {
      res.status(503).json({ error: "West Marches API is not configured." });
      return;
    }

    const normalizedPayload = normalizeWestMarchesRewardPayload(req.body);
    if (normalizedPayload.error) {
      res.status(400).json({ error: normalizedPayload.error });
      return;
    }

    try {
      const reward = await distributeReward(normalizedPayload);

      if (westMarchesRewardChannelId) {
        try {
          await notifyRewardChannel({
            characterIds: [normalizedPayload.characterId],
            rewardRequest: normalizedPayload.reward,
            staffUser: req.staffUser,
          });
        } catch (notificationError) {
          console.error(
            "Failed to post reward notification to Discord:",
            notificationError,
          );
        }
      }

      await recordAuditEvent({
        action: "westmarches_reward_distribute",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          characterId: normalizedPayload.characterId,
          reward,
        },
        ...getRequestMetadata(req),
      });

      res.status(201).json({ reward });
    } catch (westMarchesError) {
      console.error(
        "Failed to distribute West Marches reward:",
        westMarchesError,
      );

      await recordAuditEvent({
        action: "westmarches_reward_distribute",
        status: "error",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          characterId: normalizedPayload.characterId,
          error:
            westMarchesError instanceof Error
              ? westMarchesError.message
              : "unknown_error",
        },
        ...getRequestMetadata(req),
      });

      res.status(westMarchesError.status || 500).json({
        error:
          westMarchesError instanceof Error
            ? westMarchesError.message
            : "Failed to distribute reward.",
      });
    }
  },
);

app.post(
  "/api/admin/starting-graces",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const { title, slug, contentMarkdown, sortOrder, isPublished } =
      req.body ?? {};

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof slug !== "string" ||
      !slug.trim() ||
      typeof contentMarkdown !== "string" ||
      !contentMarkdown.trim()
    ) {
      res
        .status(400)
        .json({ error: "title, slug, and contentMarkdown are required." });
      return;
    }

    try {
      const grace = await createStartingGrace({
        title: title.trim(),
        slug: slug.trim(),
        contentMarkdown,
        sortOrder:
          typeof sortOrder === "number" && Number.isFinite(sortOrder)
            ? Math.trunc(sortOrder)
            : 0,
        isPublished: Boolean(isPublished),
        createdByUserId: req.staffUser.id,
      });

      await recordAuditEvent({
        action: "starting_grace_create",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: { graceId: grace.id, slug: grace.slug },
        ...getRequestMetadata(req),
      });

      res.status(201).json({ grace });
    } catch (graceError) {
      console.error("Failed to create starting grace:", graceError);
      res.status(500).json({ error: "Failed to create starting grace." });
    }
  },
);

app.patch(
  "/api/admin/starting-graces/:graceId",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const graceId = Number(req.params.graceId);
    const { title, slug, contentMarkdown, sortOrder, isPublished } =
      req.body ?? {};

    if (
      !Number.isInteger(graceId) ||
      graceId <= 0 ||
      typeof title !== "string" ||
      !title.trim() ||
      typeof slug !== "string" ||
      !slug.trim() ||
      typeof contentMarkdown !== "string" ||
      !contentMarkdown.trim()
    ) {
      res.status(400).json({
        error: "Valid graceId, title, slug, and contentMarkdown are required.",
      });
      return;
    }

    try {
      const grace = await updateStartingGrace({
        graceId,
        title: title.trim(),
        slug: slug.trim(),
        contentMarkdown,
        sortOrder:
          typeof sortOrder === "number" && Number.isFinite(sortOrder)
            ? Math.trunc(sortOrder)
            : 0,
        isPublished: Boolean(isPublished),
        updatedByUserId: req.staffUser.id,
      });

      if (!grace) {
        res.status(404).json({ error: "Starting grace not found." });
        return;
      }

      await recordAuditEvent({
        action: "starting_grace_update",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: { graceId: grace.id, slug: grace.slug },
        ...getRequestMetadata(req),
      });

      res.json({ grace });
    } catch (graceError) {
      console.error("Failed to update starting grace:", graceError);
      res.status(500).json({ error: "Failed to update starting grace." });
    }
  },
);

app.delete(
  "/api/admin/starting-graces/:graceId",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const graceId = Number(req.params.graceId);

    if (!Number.isInteger(graceId) || graceId <= 0) {
      res.status(400).json({ error: "Invalid starting grace id." });
      return;
    }

    try {
      const deleted = await deleteStartingGrace(graceId);

      if (!deleted) {
        res.status(404).json({ error: "Starting grace not found." });
        return;
      }

      await recordAuditEvent({
        action: "starting_grace_delete",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: { graceId },
        ...getRequestMetadata(req),
      });

      res.status(204).end();
    } catch (graceError) {
      console.error("Failed to delete starting grace:", graceError);
      res.status(500).json({ error: "Failed to delete starting grace." });
    }
  },
);

app.post(
  "/api/admin/starting-graces/:graceId/automation",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const graceId = Number(req.params.graceId);
    const normalizedPayload = normalizeStartingGraceAutomationPayload({
      ...req.body,
      startingGraceId: graceId,
    });

    if ("error" in normalizedPayload) {
      res.status(400).json({ error: normalizedPayload.error });
      return;
    }

    try {
      const automationEntry =
        await createStartingGraceAutomation(normalizedPayload);

      await recordAuditEvent({
        action: "starting_grace_automation_create",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          startingGraceId: normalizedPayload.startingGraceId,
          automationEntryId: automationEntry.id,
        },
        ...getRequestMetadata(req),
      });

      res.status(201).json({ automationEntry });
    } catch (graceError) {
      console.error("Failed to create starting grace automation:", graceError);
      res
        .status(500)
        .json({ error: "Failed to create starting grace automation." });
    }
  },
);

app.patch(
  "/api/admin/starting-grace-automation/:automationEntryId",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const automationEntryId = Number(req.params.automationEntryId);

    if (!Number.isInteger(automationEntryId) || automationEntryId <= 0) {
      res.status(400).json({ error: "Invalid automation entry id." });
      return;
    }

    const normalizedPayload = normalizeStartingGraceAutomationPayload(req.body);

    if ("error" in normalizedPayload) {
      res.status(400).json({ error: normalizedPayload.error });
      return;
    }

    try {
      const automationEntry = await updateStartingGraceAutomation({
        automationEntryId,
        ...normalizedPayload,
      });

      if (!automationEntry) {
        res.status(404).json({ error: "Automation entry not found." });
        return;
      }

      await recordAuditEvent({
        action: "starting_grace_automation_update",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          automationEntryId,
          startingGraceId: normalizedPayload.startingGraceId,
        },
        ...getRequestMetadata(req),
      });

      res.json({ automationEntry });
    } catch (graceError) {
      console.error("Failed to update starting grace automation:", graceError);
      res
        .status(500)
        .json({ error: "Failed to update starting grace automation." });
    }
  },
);

app.delete(
  "/api/admin/starting-grace-automation/:automationEntryId",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const automationEntryId = Number(req.params.automationEntryId);

    if (!Number.isInteger(automationEntryId) || automationEntryId <= 0) {
      res.status(400).json({ error: "Invalid automation entry id." });
      return;
    }

    try {
      const deleted = await deleteStartingGraceAutomation(automationEntryId);

      if (!deleted) {
        res.status(404).json({ error: "Automation entry not found." });
        return;
      }

      await recordAuditEvent({
        action: "starting_grace_automation_delete",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: { automationEntryId },
        ...getRequestMetadata(req),
      });

      res.status(204).end();
    } catch (graceError) {
      console.error("Failed to delete starting grace automation:", graceError);
      res
        .status(500)
        .json({ error: "Failed to delete starting grace automation." });
    }
  },
);

app.post(
  "/api/admin/boons",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const { title, slug, contentMarkdown, sortOrder, isPublished } =
      req.body ?? {};

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof slug !== "string" ||
      !slug.trim() ||
      typeof contentMarkdown !== "string" ||
      !contentMarkdown.trim()
    ) {
      res
        .status(400)
        .json({ error: "title, slug, and contentMarkdown are required." });
      return;
    }

    try {
      const boon = await createBoon({
        title: title.trim(),
        slug: slug.trim(),
        contentMarkdown,
        sortOrder:
          typeof sortOrder === "number" && Number.isFinite(sortOrder)
            ? Math.trunc(sortOrder)
            : 0,
        isPublished: Boolean(isPublished),
        createdByUserId: req.staffUser.id,
      });

      await recordAuditEvent({
        action: "boon_create",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: { boonId: boon.id, slug: boon.slug },
        ...getRequestMetadata(req),
      });

      res.status(201).json({ boon });
    } catch (boonError) {
      console.error("Failed to create boon:", boonError);
      res.status(500).json({ error: "Failed to create boon." });
    }
  },
);

app.patch(
  "/api/admin/boons/:boonId",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const boonId = Number(req.params.boonId);
    const { title, slug, contentMarkdown, sortOrder, isPublished } =
      req.body ?? {};

    if (
      !Number.isInteger(boonId) ||
      boonId <= 0 ||
      typeof title !== "string" ||
      !title.trim() ||
      typeof slug !== "string" ||
      !slug.trim() ||
      typeof contentMarkdown !== "string" ||
      !contentMarkdown.trim()
    ) {
      res.status(400).json({
        error: "Valid boonId, title, slug, and contentMarkdown are required.",
      });
      return;
    }

    try {
      const boon = await updateBoon({
        boonId,
        title: title.trim(),
        slug: slug.trim(),
        contentMarkdown,
        sortOrder:
          typeof sortOrder === "number" && Number.isFinite(sortOrder)
            ? Math.trunc(sortOrder)
            : 0,
        isPublished: Boolean(isPublished),
        updatedByUserId: req.staffUser.id,
      });

      if (!boon) {
        res.status(404).json({ error: "Boon not found." });
        return;
      }

      await recordAuditEvent({
        action: "boon_update",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: { boonId: boon.id, slug: boon.slug },
        ...getRequestMetadata(req),
      });

      res.json({ boon });
    } catch (boonError) {
      console.error("Failed to update boon:", boonError);
      res.status(500).json({ error: "Failed to update boon." });
    }
  },
);

app.delete(
  "/api/admin/boons/:boonId",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const boonId = Number(req.params.boonId);

    if (!Number.isInteger(boonId) || boonId <= 0) {
      res.status(400).json({ error: "Invalid boon id." });
      return;
    }

    try {
      const deleted = await deleteBoon(boonId);

      if (!deleted) {
        res.status(404).json({ error: "Boon not found." });
        return;
      }

      await recordAuditEvent({
        action: "boon_delete",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: { boonId },
        ...getRequestMetadata(req),
      });

      res.status(204).end();
    } catch (boonError) {
      console.error("Failed to delete boon:", boonError);
      res.status(500).json({ error: "Failed to delete boon." });
    }
  },
);

app.post(
  "/api/admin/boons/:boonId/automation",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const boonId = Number(req.params.boonId);
    const normalizedPayload = normalizeBoonAutomationPayload({
      ...req.body,
      boonId,
    });

    if ("error" in normalizedPayload) {
      res.status(400).json({ error: normalizedPayload.error });
      return;
    }

    try {
      const automationEntry = await createBoonAutomation(normalizedPayload);

      await recordAuditEvent({
        action: "boon_automation_create",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          boonId: normalizedPayload.boonId,
          automationEntryId: automationEntry.id,
        },
        ...getRequestMetadata(req),
      });

      res.status(201).json({ automationEntry });
    } catch (boonError) {
      console.error("Failed to create boon automation:", boonError);
      res.status(500).json({ error: "Failed to create boon automation." });
    }
  },
);

app.patch(
  "/api/admin/boon-automation/:automationEntryId",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const automationEntryId = Number(req.params.automationEntryId);

    if (!Number.isInteger(automationEntryId) || automationEntryId <= 0) {
      res.status(400).json({ error: "Invalid automation entry id." });
      return;
    }

    const normalizedPayload = normalizeBoonAutomationPayload(req.body);

    if ("error" in normalizedPayload) {
      res.status(400).json({ error: normalizedPayload.error });
      return;
    }

    try {
      const automationEntry = await updateBoonAutomation({
        automationEntryId,
        ...normalizedPayload,
      });

      if (!automationEntry) {
        res.status(404).json({ error: "Automation entry not found." });
        return;
      }

      await recordAuditEvent({
        action: "boon_automation_update",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          automationEntryId,
          boonId: normalizedPayload.boonId,
        },
        ...getRequestMetadata(req),
      });

      res.json({ automationEntry });
    } catch (boonError) {
      console.error("Failed to update boon automation:", boonError);
      res.status(500).json({ error: "Failed to update boon automation." });
    }
  },
);

app.delete(
  "/api/admin/boon-automation/:automationEntryId",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const automationEntryId = Number(req.params.automationEntryId);

    if (!Number.isInteger(automationEntryId) || automationEntryId <= 0) {
      res.status(400).json({ error: "Invalid automation entry id." });
      return;
    }

    try {
      const deleted = await deleteBoonAutomation(automationEntryId);

      if (!deleted) {
        res.status(404).json({ error: "Automation entry not found." });
        return;
      }

      await recordAuditEvent({
        action: "boon_automation_delete",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: { automationEntryId },
        ...getRequestMetadata(req),
      });

      res.status(204).end();
    } catch (boonError) {
      console.error("Failed to delete boon automation:", boonError);
      res.status(500).json({ error: "Failed to delete boon automation." });
    }
  },
);

app.post(
  "/api/admin/guilds",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const {
      name,
      slug,
      emblemSrc,
      emblemAlt,
      summary,
      sortOrder,
      isPublished,
    } = req.body ?? {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof slug !== "string" ||
      !slug.trim()
    ) {
      res.status(400).json({ error: "name and slug are required." });
      return;
    }

    try {
      const guild = await createGuild({
        name: name.trim(),
        slug: slug.trim(),
        emblemSrc: typeof emblemSrc === "string" ? emblemSrc.trim() : "",
        emblemAlt: typeof emblemAlt === "string" ? emblemAlt.trim() : "",
        summary: typeof summary === "string" ? summary.trim() : "",
        sortOrder:
          typeof sortOrder === "number" && Number.isFinite(sortOrder)
            ? Math.trunc(sortOrder)
            : 0,
        isPublished: Boolean(isPublished),
        createdByUserId: req.staffUser.id,
      });

      await recordAuditEvent({
        action: "guild_create",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: { guildId: guild.id, slug: guild.slug },
        ...getRequestMetadata(req),
      });

      res.status(201).json({ guild });
    } catch (guildError) {
      console.error("Failed to create guild:", guildError);
      res.status(500).json({ error: "Failed to create guild." });
    }
  },
);

app.patch(
  "/api/admin/guilds/:guildId",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const guildId = Number(req.params.guildId);
    const {
      name,
      slug,
      emblemSrc,
      emblemAlt,
      summary,
      sortOrder,
      isPublished,
    } = req.body ?? {};

    if (
      !Number.isInteger(guildId) ||
      guildId <= 0 ||
      typeof name !== "string" ||
      !name.trim() ||
      typeof slug !== "string" ||
      !slug.trim()
    ) {
      res
        .status(400)
        .json({ error: "Valid guildId, name, and slug are required." });
      return;
    }

    try {
      const guild = await updateGuild({
        guildId,
        name: name.trim(),
        slug: slug.trim(),
        emblemSrc: typeof emblemSrc === "string" ? emblemSrc.trim() : "",
        emblemAlt: typeof emblemAlt === "string" ? emblemAlt.trim() : "",
        summary: typeof summary === "string" ? summary.trim() : "",
        sortOrder:
          typeof sortOrder === "number" && Number.isFinite(sortOrder)
            ? Math.trunc(sortOrder)
            : 0,
        isPublished: Boolean(isPublished),
        updatedByUserId: req.staffUser.id,
      });

      if (!guild) {
        res.status(404).json({ error: "Guild not found." });
        return;
      }

      await recordAuditEvent({
        action: "guild_update",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: { guildId: guild.id, slug: guild.slug },
        ...getRequestMetadata(req),
      });

      res.json({ guild });
    } catch (guildError) {
      console.error("Failed to update guild:", guildError);
      res.status(500).json({ error: "Failed to update guild." });
    }
  },
);

app.delete(
  "/api/admin/guilds/:guildId",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const guildId = Number(req.params.guildId);

    if (!Number.isInteger(guildId) || guildId <= 0) {
      res.status(400).json({ error: "Invalid guild id." });
      return;
    }

    try {
      const deleted = await deleteGuild(guildId);

      if (!deleted) {
        res.status(404).json({ error: "Guild not found." });
        return;
      }

      await recordAuditEvent({
        action: "guild_delete",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: { guildId },
        ...getRequestMetadata(req),
      });

      res.status(204).end();
    } catch (guildError) {
      console.error("Failed to delete guild:", guildError);
      res.status(500).json({ error: "Failed to delete guild." });
    }
  },
);

app.post(
  "/api/admin/guilds/:guildId/upgrades",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const guildId = Number(req.params.guildId);
    const { title, requirement, reward, details, sortOrder, isPublished } =
      req.body ?? {};

    if (
      !Number.isInteger(guildId) ||
      guildId <= 0 ||
      typeof title !== "string" ||
      !title.trim()
    ) {
      res.status(400).json({ error: "Valid guildId and title are required." });
      return;
    }

    try {
      const upgrade = await createGuildUpgrade({
        guildId,
        title: title.trim(),
        requirement: typeof requirement === "string" ? requirement.trim() : "",
        reward: typeof reward === "string" ? reward.trim() : "",
        details: typeof details === "string" ? details.trim() : "",
        sortOrder:
          typeof sortOrder === "number" && Number.isFinite(sortOrder)
            ? Math.trunc(sortOrder)
            : 0,
        isPublished: Boolean(isPublished),
        createdByUserId: req.staffUser.id,
      });

      await recordAuditEvent({
        action: "guild_upgrade_create",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: { guildId, upgradeId: upgrade.id },
        ...getRequestMetadata(req),
      });

      res.status(201).json({ upgrade });
    } catch (guildError) {
      console.error("Failed to create guild upgrade:", guildError);
      res.status(500).json({ error: "Failed to create guild upgrade." });
    }
  },
);

app.patch(
  "/api/admin/guild-upgrades/:upgradeId",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const upgradeId = Number(req.params.upgradeId);
    const { title, requirement, reward, details, sortOrder, isPublished } =
      req.body ?? {};

    if (
      !Number.isInteger(upgradeId) ||
      upgradeId <= 0 ||
      typeof title !== "string" ||
      !title.trim()
    ) {
      res
        .status(400)
        .json({ error: "Valid upgradeId and title are required." });
      return;
    }

    try {
      const upgrade = await updateGuildUpgrade({
        upgradeId,
        title: title.trim(),
        requirement: typeof requirement === "string" ? requirement.trim() : "",
        reward: typeof reward === "string" ? reward.trim() : "",
        details: typeof details === "string" ? details.trim() : "",
        sortOrder:
          typeof sortOrder === "number" && Number.isFinite(sortOrder)
            ? Math.trunc(sortOrder)
            : 0,
        isPublished: Boolean(isPublished),
        updatedByUserId: req.staffUser.id,
      });

      if (!upgrade) {
        res.status(404).json({ error: "Guild upgrade not found." });
        return;
      }

      await recordAuditEvent({
        action: "guild_upgrade_update",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: { upgradeId: upgrade.id, guildId: upgrade.guildId },
        ...getRequestMetadata(req),
      });

      res.json({ upgrade });
    } catch (guildError) {
      console.error("Failed to update guild upgrade:", guildError);
      res.status(500).json({ error: "Failed to update guild upgrade." });
    }
  },
);

app.delete(
  "/api/admin/guild-upgrades/:upgradeId",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const upgradeId = Number(req.params.upgradeId);

    if (!Number.isInteger(upgradeId) || upgradeId <= 0) {
      res.status(400).json({ error: "Invalid upgrade id." });
      return;
    }

    try {
      const deleted = await deleteGuildUpgrade(upgradeId);

      if (!deleted) {
        res.status(404).json({ error: "Guild upgrade not found." });
        return;
      }

      await recordAuditEvent({
        action: "guild_upgrade_delete",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: { upgradeId },
        ...getRequestMetadata(req),
      });

      res.status(204).end();
    } catch (guildError) {
      console.error("Failed to delete guild upgrade:", guildError);
      res.status(500).json({ error: "Failed to delete guild upgrade." });
    }
  },
);

app.post(
  "/api/admin/guild-upgrades/:upgradeId/automation",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const upgradeId = Number(req.params.upgradeId);
    const normalizedPayload = normalizeGuildUpgradeAutomationPayload({
      ...req.body,
      guildUpgradeId: upgradeId,
    });

    if ("error" in normalizedPayload) {
      res.status(400).json({ error: normalizedPayload.error });
      return;
    }

    try {
      const automationEntry =
        await createGuildUpgradeAutomation(normalizedPayload);

      await recordAuditEvent({
        action: "guild_upgrade_automation_create",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          guildUpgradeId: normalizedPayload.guildUpgradeId,
          automationEntryId: automationEntry.id,
        },
        ...getRequestMetadata(req),
      });

      res.status(201).json({ automationEntry });
    } catch (guildError) {
      console.error("Failed to create guild upgrade automation:", guildError);
      res
        .status(500)
        .json({ error: "Failed to create guild upgrade automation." });
    }
  },
);

app.patch(
  "/api/admin/guild-automation/:automationEntryId",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const automationEntryId = Number(req.params.automationEntryId);

    if (!Number.isInteger(automationEntryId) || automationEntryId <= 0) {
      res.status(400).json({ error: "Invalid automation entry id." });
      return;
    }

    const normalizedPayload = normalizeGuildUpgradeAutomationPayload(req.body);

    if ("error" in normalizedPayload) {
      res.status(400).json({ error: normalizedPayload.error });
      return;
    }

    try {
      const automationEntry = await updateGuildUpgradeAutomation({
        automationEntryId,
        ...normalizedPayload,
      });

      if (!automationEntry) {
        res.status(404).json({ error: "Automation entry not found." });
        return;
      }

      await recordAuditEvent({
        action: "guild_upgrade_automation_update",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          automationEntryId,
          guildUpgradeId: normalizedPayload.guildUpgradeId,
        },
        ...getRequestMetadata(req),
      });

      res.json({ automationEntry });
    } catch (guildError) {
      console.error("Failed to update guild upgrade automation:", guildError);
      res
        .status(500)
        .json({ error: "Failed to update guild upgrade automation." });
    }
  },
);

app.delete(
  "/api/admin/guild-automation/:automationEntryId",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const automationEntryId = Number(req.params.automationEntryId);

    if (!Number.isInteger(automationEntryId) || automationEntryId <= 0) {
      res.status(400).json({ error: "Invalid automation entry id." });
      return;
    }

    try {
      const deleted = await deleteGuildUpgradeAutomation(automationEntryId);

      if (!deleted) {
        res.status(404).json({ error: "Automation entry not found." });
        return;
      }

      await recordAuditEvent({
        action: "guild_upgrade_automation_delete",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: { automationEntryId },
        ...getRequestMetadata(req),
      });

      res.status(204).end();
    } catch (guildError) {
      console.error("Failed to delete guild upgrade automation:", guildError);
      res
        .status(500)
        .json({ error: "Failed to delete guild upgrade automation." });
    }
  },
);

app.post(
  "/api/admin/homebrew/entries",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const { section, title, slug, bodyMarkdown, sortOrder, isPublished } =
      req.body ?? {};

    if (
      typeof section !== "string" ||
      !section.trim() ||
      typeof title !== "string" ||
      !title.trim() ||
      typeof slug !== "string" ||
      !slug.trim() ||
      typeof bodyMarkdown !== "string"
    ) {
      res.status(400).json({
        error: "section, title, slug, and bodyMarkdown are required.",
      });
      return;
    }

    const parsedSortOrder =
      typeof sortOrder === "number" && Number.isFinite(sortOrder)
        ? Math.trunc(sortOrder)
        : 0;

    try {
      const entry = await createHomebrewEntry({
        section: section.trim(),
        title: title.trim(),
        slug: slug.trim(),
        bodyMarkdown,
        sortOrder: parsedSortOrder,
        isPublished: Boolean(isPublished),
        createdByUserId: req.staffUser.id,
      });

      await recordAuditEvent({
        action: "homebrew_entry_create",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          entryId: entry.id,
          section: entry.section,
          slug: entry.slug,
        },
        ...getRequestMetadata(req),
      });

      res.status(201).json({ entry });
    } catch (homebrewError) {
      console.error("Failed to create homebrew entry:", homebrewError);
      res.status(500).json({ error: "Failed to create homebrew entry." });
    }
  },
);

app.post(
  "/api/admin/homebrew/items",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const {
      homebrewEntryId,
      parentItemId,
      label,
      href,
      sortOrder,
      isPublished,
    } = req.body ?? {};

    if (
      !Number.isInteger(homebrewEntryId) ||
      homebrewEntryId <= 0 ||
      typeof label !== "string" ||
      !label.trim() ||
      typeof href !== "string"
    ) {
      res.status(400).json({
        error: "homebrewEntryId, label, and href string are required.",
      });
      return;
    }

    const parsedSortOrder =
      typeof sortOrder === "number" && Number.isFinite(sortOrder)
        ? Math.trunc(sortOrder)
        : 0;

    try {
      const item = await createHomebrewSectionItem({
        homebrewEntryId,
        parentItemId:
          Number.isInteger(parentItemId) && parentItemId > 0
            ? parentItemId
            : null,
        label: label.trim(),
        href: href.trim(),
        sortOrder: parsedSortOrder,
        isPublished: Boolean(isPublished),
        createdByUserId: req.staffUser.id,
      });

      await recordAuditEvent({
        action: "homebrew_section_item_create",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          itemId: item.id,
          homebrewEntryId: item.homebrewEntryId,
          label: item.label,
        },
        ...getRequestMetadata(req),
      });

      res.status(201).json({ item });
    } catch (homebrewError) {
      console.error("Failed to create homebrew section item:", homebrewError);
      res
        .status(500)
        .json({ error: "Failed to create homebrew section item." });
    }
  },
);

app.patch(
  "/api/admin/homebrew/items/:itemId",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const itemId = Number(req.params.itemId);
    const { parentItemId, label, href } = req.body ?? {};

    if (
      !Number.isInteger(itemId) ||
      itemId <= 0 ||
      typeof label !== "string" ||
      !label.trim() ||
      typeof href !== "string"
    ) {
      res
        .status(400)
        .json({ error: "itemId, label, and href string are required." });
      return;
    }

    try {
      const item = await updateHomebrewSectionItem({
        itemId,
        parentItemId:
          Number.isInteger(parentItemId) && parentItemId > 0
            ? parentItemId
            : null,
        label: label.trim(),
        href: href.trim(),
        updatedByUserId: req.staffUser.id,
      });

      if (!item) {
        res.status(404).json({ error: "Item not found." });
        return;
      }

      await recordAuditEvent({
        action: "homebrew_section_item_update",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          itemId: item.id,
          homebrewEntryId: item.homebrewEntryId,
          label: item.label,
        },
        ...getRequestMetadata(req),
      });

      res.json({ item });
    } catch (homebrewError) {
      console.error("Failed to update homebrew section item:", homebrewError);
      res
        .status(500)
        .json({ error: "Failed to update homebrew section item." });
    }
  },
);

app.delete(
  "/api/admin/homebrew/items/:itemId",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const itemId = Number(req.params.itemId);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      res.status(400).json({ error: "Invalid item id." });
      return;
    }

    try {
      const deleted = await deleteHomebrewSectionItem(itemId);

      if (!deleted) {
        res.status(404).json({ error: "Item not found." });
        return;
      }

      await recordAuditEvent({
        action: "homebrew_section_item_delete",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: { itemId },
        ...getRequestMetadata(req),
      });

      res.status(204).end();
    } catch (homebrewError) {
      console.error("Failed to delete homebrew section item:", homebrewError);
      res
        .status(500)
        .json({ error: "Failed to delete homebrew section item." });
    }
  },
);

app.post(
  "/api/admin/homebrew/items/:itemId/automation",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const itemId = Number(req.params.itemId);
    const normalizedPayload = normalizeHomebrewAutomationPayload({
      ...req.body,
      homebrewSectionItemId: itemId,
    });

    if ("error" in normalizedPayload) {
      res.status(400).json({ error: normalizedPayload.error });
      return;
    }

    try {
      const automationEntry =
        await createHomebrewItemAutomation(normalizedPayload);

      await recordAuditEvent({
        action: "homebrew_item_automation_create",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          itemId,
          homebrewEntryId: normalizedPayload.homebrewEntryId,
          automationEntryId: automationEntry.id,
        },
        ...getRequestMetadata(req),
      });

      res.status(201).json({ automationEntry });
    } catch (homebrewError) {
      console.error(
        "Failed to create homebrew item automation:",
        homebrewError,
      );
      res
        .status(500)
        .json({ error: "Failed to create homebrew item automation." });
    }
  },
);

app.patch(
  "/api/admin/homebrew/automation/:automationEntryId",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const automationEntryId = Number(req.params.automationEntryId);

    if (!Number.isInteger(automationEntryId) || automationEntryId <= 0) {
      res.status(400).json({ error: "Invalid automation entry id." });
      return;
    }

    const normalizedPayload = normalizeHomebrewAutomationPayload(req.body);

    if ("error" in normalizedPayload) {
      res.status(400).json({ error: normalizedPayload.error });
      return;
    }

    try {
      const automationEntry = await updateHomebrewItemAutomation({
        automationEntryId,
        ...normalizedPayload,
      });

      if (!automationEntry) {
        res.status(404).json({ error: "Automation entry not found." });
        return;
      }

      await recordAuditEvent({
        action: "homebrew_item_automation_update",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          automationEntryId,
          itemId: normalizedPayload.homebrewSectionItemId,
          homebrewEntryId: normalizedPayload.homebrewEntryId,
        },
        ...getRequestMetadata(req),
      });

      res.json({ automationEntry });
    } catch (homebrewError) {
      console.error(
        "Failed to update homebrew item automation:",
        homebrewError,
      );
      res
        .status(500)
        .json({ error: "Failed to update homebrew item automation." });
    }
  },
);

app.delete(
  "/api/admin/homebrew/automation/:automationEntryId",
  requireTrustedOrigin,
  requireStaffSession,
  async (req, res) => {
    const automationEntryId = Number(req.params.automationEntryId);

    if (!Number.isInteger(automationEntryId) || automationEntryId <= 0) {
      res.status(400).json({ error: "Invalid automation entry id." });
      return;
    }

    try {
      const deleted = await deleteHomebrewItemAutomation(automationEntryId);

      if (!deleted) {
        res.status(404).json({ error: "Automation entry not found." });
        return;
      }

      await recordAuditEvent({
        action: "homebrew_item_automation_delete",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: { automationEntryId },
        ...getRequestMetadata(req),
      });

      res.status(204).end();
    } catch (homebrewError) {
      console.error(
        "Failed to delete homebrew item automation:",
        homebrewError,
      );
      res
        .status(500)
        .json({ error: "Failed to delete homebrew item automation." });
    }
  },
);

app.post(
  "/auth/logout",
  requireTrustedOrigin,
  authRateLimiter,
  async (req, res) => {
    try {
      const sessionToken = getSessionTokenFromRequest(req);
      const user = await getSessionUser(sessionToken);
      await deleteSession(sessionToken);
      clearSessionCookie(res);
      await recordAuditEvent({
        action: "logout",
        status: "success",
        userId: user?.id ?? null,
        discordUserId: user?.discordUserId ?? null,
        metadata: {},
        ...getRequestMetadata(req),
      });
      res.status(204).end();
    } catch (logoutError) {
      console.error("Logout failed:", logoutError);
      res.status(500).json({ error: "Failed to log out." });
    }
  },
);

app.post(
  "/api/admin/calendar",
  requireTrustedOrigin,
  adminRateLimiter,
  requireStaffSession,
  async (req, res) => {
    const { title, startDate, endDate, category, summary, details } =
      req.body ?? {};

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof startDate !== "string" ||
      !startDate ||
      typeof endDate !== "string" ||
      !endDate
    ) {
      res.status(400).json({
        error: "title, startDate, and endDate are required.",
      });
      return;
    }

    if (endDate < startDate) {
      res.status(400).json({
        error: "endDate cannot be earlier than startDate.",
      });
      return;
    }

    try {
      const event = await createCalendarEvent({
        title: title.trim(),
        slug: `${slugifyCalendarTitle(title)}-${Date.now().toString(36)}`,
        startDate,
        endDate,
        category: typeof category === "string" ? category.trim() : "",
        summary: typeof summary === "string" ? summary.trim() : "",
        details: typeof details === "string" ? details.trim() : "",
        createdByUserId: req.staffUser.id,
      });

      await recordAuditEvent({
        action: "calendar_event_create",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          eventId: event.id,
          slug: event.slug,
          startDate,
          endDate,
        },
        ...getRequestMetadata(req),
      });

      res.status(201).json({ event });
    } catch (calendarError) {
      console.error("Failed to create calendar event:", calendarError);
      res.status(500).json({ error: "Failed to create calendar event." });
    }
  },
);

app.delete(
  "/api/admin/calendar/:eventId",
  requireTrustedOrigin,
  adminRateLimiter,
  requireStaffSession,
  async (req, res) => {
    const eventId = Number(req.params.eventId);

    if (!Number.isInteger(eventId) || eventId <= 0) {
      res.status(400).json({ error: "Invalid event id." });
      return;
    }

    try {
      const deleted = await deleteCalendarEvent(eventId);

      if (!deleted) {
        res.status(404).json({ error: "Event not found." });
        return;
      }

      await recordAuditEvent({
        action: "calendar_event_delete",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: { eventId },
        ...getRequestMetadata(req),
      });

      res.status(204).end();
    } catch (calendarError) {
      console.error("Failed to delete calendar event:", calendarError);
      res.status(500).json({ error: "Failed to delete calendar event." });
    }
  },
);

app.patch(
  "/api/admin/calendar/:eventId",
  requireTrustedOrigin,
  adminRateLimiter,
  requireStaffSession,
  async (req, res) => {
    const eventId = Number(req.params.eventId);
    const { title, startDate, endDate, category, summary, details } =
      req.body ?? {};

    if (!Number.isInteger(eventId) || eventId <= 0) {
      res.status(400).json({ error: "Invalid event id." });
      return;
    }

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof startDate !== "string" ||
      !startDate ||
      typeof endDate !== "string" ||
      !endDate
    ) {
      res.status(400).json({
        error: "title, startDate, and endDate are required.",
      });
      return;
    }

    if (endDate < startDate) {
      res.status(400).json({
        error: "endDate cannot be earlier than startDate.",
      });
      return;
    }

    try {
      const event = await updateCalendarEvent({
        eventId,
        title: title.trim(),
        startDate,
        endDate,
        category: typeof category === "string" ? category.trim() : "",
        summary: typeof summary === "string" ? summary.trim() : "",
        details: typeof details === "string" ? details.trim() : "",
        updatedByUserId: req.staffUser.id,
      });

      if (!event) {
        res.status(404).json({ error: "Event not found." });
        return;
      }

      await recordAuditEvent({
        action: "calendar_event_update",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          eventId: event.id,
          slug: event.slug,
          startDate,
          endDate,
        },
        ...getRequestMetadata(req),
      });

      res.json({ event });
    } catch (calendarError) {
      console.error("Failed to update calendar event:", calendarError);
      res.status(500).json({ error: "Failed to update calendar event." });
    }
  },
);

app.get("/api/me", sessionRateLimiter, async (req, res) => {
  try {
    const user = await getSessionUser(getSessionTokenFromRequest(req));

    if (!user) {
      res.status(401).json({ authenticated: false });
      return;
    }

    res.json({
      authenticated: true,
      user: {
        ...user,
        canSubmitRewards: Boolean(user.isStaff || user.isDm),
      },
    });
  } catch (sessionError) {
    console.error("Session lookup failed:", sessionError);
    res.status(500).json({ error: "Failed to load session." });
  }
});

app.listen(port, () => {
  console.log(`Auth server listening on http://localhost:${port}`);
});

deleteExpiredSessions().catch((error) => {
  console.error("Initial expired session cleanup failed:", error);
});

setInterval(
  () => {
    deleteExpiredSessions().catch((error) => {
      console.error("Expired session cleanup failed:", error);
    });
  },
  60 * 60 * 1000,
).unref();
