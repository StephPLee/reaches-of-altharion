const express = require("express");
const { serialize, parse } = require("cookie");
const crypto = require("node:crypto");
const {
  parseFaqMarkdown,
} = require("../shared/faqContent");
const {
  appOrigin,
  appOriginUrl,
  adminRateLimitMaxRequests,
  adminRateLimitWindowMs,
  authCallbackRateLimitMaxRequests,
  authRateLimitMaxRequests,
  authRateLimitWindowMs,
  calendarAnnouncementChannelId,
  startingGracesChannelId,
  characterCreationChannelId,
  cookieSecure,
  isProduction,
  marketplaceChannelId,
  marketplaceMessageId,
  oauthReturnToCookieName,
  oauthStateCookieName,
  oauthStateTtlMinutes,
  playerRoleId,
  port,
  requiredRoleId,
  dmRoleId,
  sessionRateLimitMaxRequests,
  sessionRateLimitWindowMs,
  sessionCookieSameSite,
  staffRevalidationMinutes,
  sessionCookieName,
  westMarchesGoldCurrencyId,
  westMarchesScCurrencyId,
} = require("./config");
const { recordAuditEvent } = require("./audit");
const {
  deleteSavedAvraeCharacter,
  listSavedAvraeCharacters,
  updateAvraeCharacterOverrides,
  upsertSavedAvraeCharacter,
} = require("./avraeCharacters");
const {
  createSavedAvraeModifier,
  deleteSavedAvraeModifier,
  listSavedAvraeModifiers,
  normalizeModifierPayload,
  updateSavedAvraeModifier,
} = require("./avraeModifiers");
const {
  claimStatRollSet,
  listStatRollSets,
  updateDiscordStatMessage,
} = require("./statRolls");
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
  listGuildRosters,
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
  createSourcebook,
  deleteSourcebook,
  listSourcebooks,
  updateSourcebook,
} = require("./sourcebooks");
const {
  getWikiPage,
  isAllowedWikiPageSlug,
  upsertWikiPage,
} = require("./wikiPages");
const {
  createBannedContentEntry,
  deleteBannedContentEntry,
  listBannedContentEntries,
  updateBannedContentEntry,
} = require("./bannedContent");
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
  deleteChannelMessage,
  editChannelMessage,
  exchangeCodeForToken,
  fetchDiscordMessage,
  fetchDiscordUser,
  fetchGuildMember,
  fetchGuildRoles,
  memberHasRole,
  postChannelMessage,
} = require("./discord");
const {
  syncStartingGraceToDiscord,
  syncWikiPageToDiscord,
} = require("./discordSync");
const { fetchDdbCharacter } = require("./ddbCharacters");
const { fetchBestiaryBuilderBestiary } = require("./bestiaryBuilder");
const {
  MARKETPLACE_TIME_ZONE,
  createMarketplace,
  formatZonedLocalInput,
  generateConsumablesMarketplaceContent,
  generateMarketplaceContent,
  getDefaultMarketplaceScheduledFor,
  listRecentMarketplaces,
  parseMarketplaceScheduledForLocal,
  publishDueMarketplaces,
  validateMarketplaceContent,
} = require("./marketplace");
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
  distributeRewards,
  getCharacter,
  getEventCurrencyMapping,
  isWestMarchesConfigured,
  listAllCharacters,
  listCharacterAttributeStats,
  listCurrencies,
  listRecentAdventures,
} = require("./westmarches");

const app = express();
const rateLimitBuckets = new Map();
const DISCORD_MESSAGE_LIMIT = 2000;
const ANNOUNCEMENT_CONTENT_LIMIT = 10000;

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

async function revalidateGuildUser(user) {
  const lastCheckTimestamp = user.lastGuildCheckAt
    ? new Date(user.lastGuildCheckAt).getTime()
    : 0;
  const revalidationWindowMs = staffRevalidationMinutes * 60 * 1000;

  if (Date.now() - lastCheckTimestamp <= revalidationWindowMs) {
    return user;
  }

  const guildMember = await fetchGuildMember(user.discordUserId);
  if (!guildMember) {
    await deleteSessionsForUser(user.id);
    return null;
  }

  const isStaff = memberHasRole(guildMember, requiredRoleId);
  const isDm = dmRoleId ? memberHasRole(guildMember, dmRoleId) : false;
  await updateUserRoleStatus({
    discordUserId: user.discordUserId,
    isStaff,
    isDm,
  });

  return {
    ...user,
    isStaff,
    isDm,
    lastGuildCheckAt: new Date(),
  };
}

async function requireMemberSession(req, res, next) {
  try {
    const sessionToken = getSessionTokenFromRequest(req);
    const user = await getSessionUser(sessionToken);

    if (!user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const revalidatedUser = await revalidateGuildUser(user);
    if (!revalidatedUser) {
      clearSessionCookie(res);
      res.status(403).json({ error: "Server membership required." });
      return;
    }

    req.memberUser = revalidatedUser;
    next();
  } catch (sessionError) {
    console.error("Member session check failed:", sessionError);
    res.status(500).json({ error: "Failed to verify session." });
  }
}

app.get("/health", async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true });
});

app.post(
  "/api/avrae/ddb-character/preview",
  requireTrustedOrigin,
  sessionRateLimiter,
  async (req, res) => {
    const { url } = req.body ?? {};
    if (typeof url !== "string" || !url.trim()) {
      res.status(400).json({ error: "D&D Beyond character link is required." });
      return;
    }

    try {
      const character = await fetchDdbCharacter(url);
      res.json({ character });
    } catch (ddbError) {
      const statusCode = Number(ddbError.statusCode) || 500;
      if (statusCode >= 500) {
        console.error("Failed to preview D&D Beyond character:", ddbError);
      }
      res.status(statusCode).json({
        error:
          ddbError instanceof Error
            ? ddbError.message
            : "Failed to preview D&D Beyond character.",
      });
    }
  },
);

app.post(
  "/api/avrae/ddb-character",
  requireTrustedOrigin,
  sessionRateLimiter,
  requireMemberSession,
  async (req, res) => {
    const { url } = req.body ?? {};
    if (typeof url !== "string" || !url.trim()) {
      res.status(400).json({ error: "D&D Beyond character link is required." });
      return;
    }

    try {
      const character = await fetchDdbCharacter(url);
      const savedCharacter = await upsertSavedAvraeCharacter({
        userId: req.memberUser.id,
        character,
      });
      res.json({ character: savedCharacter });
    } catch (ddbError) {
      const statusCode = Number(ddbError.statusCode) || 500;
      if (statusCode >= 500) {
        console.error("Failed to sync D&D Beyond character:", ddbError);
      }
      res.status(statusCode).json({
        error:
          ddbError instanceof Error
            ? ddbError.message
            : "Failed to sync D&D Beyond character.",
      });
    }
  },
);

app.post(
  "/api/avrae/bestiary-builder/preview",
  requireTrustedOrigin,
  sessionRateLimiter,
  async (req, res) => {
    const { url } = req.body ?? {};
    if (typeof url !== "string" || !url.trim()) {
      res.status(400).json({ error: "Bestiary Builder share link is required." });
      return;
    }

    try {
      const bestiary = await fetchBestiaryBuilderBestiary(url);
      res.json(bestiary);
    } catch (bestiaryError) {
      const statusCode = Number(bestiaryError.statusCode) || 500;
      if (statusCode >= 500) {
        console.error("Failed to preview Bestiary Builder bestiary:", bestiaryError);
      }
      res.status(statusCode).json({
        error:
          bestiaryError instanceof Error
            ? bestiaryError.message
            : "Failed to preview Bestiary Builder bestiary.",
      });
    }
  },
);

app.post(
  "/api/avrae/bestiary-builder",
  requireTrustedOrigin,
  sessionRateLimiter,
  requireMemberSession,
  async (req, res) => {
    const { url } = req.body ?? {};
    if (typeof url !== "string" || !url.trim()) {
      res.status(400).json({ error: "Bestiary Builder share link is required." });
      return;
    }

    try {
      const bestiary = await fetchBestiaryBuilderBestiary(url);
      const creatures = [];
      for (const creature of bestiary.creatures) {
        creatures.push(
          await upsertSavedAvraeCharacter({
            userId: req.memberUser.id,
            character: creature,
          }),
        );
      }
      res.json({ bestiary: bestiary.bestiary, creatures });
    } catch (bestiaryError) {
      const statusCode = Number(bestiaryError.statusCode) || 500;
      if (statusCode >= 500) {
        console.error("Failed to import Bestiary Builder bestiary:", bestiaryError);
      }
      res.status(statusCode).json({
        error:
          bestiaryError instanceof Error
            ? bestiaryError.message
            : "Failed to import Bestiary Builder bestiary.",
      });
    }
  },
);

app.get(
  "/api/avrae/characters",
  sessionRateLimiter,
  requireMemberSession,
  async (req, res) => {
    try {
      const characters = await listSavedAvraeCharacters(req.memberUser.id);
      res.json({ characters });
    } catch (avraeError) {
      console.error("Failed to list Avrae characters:", avraeError);
      res.status(500).json({ error: "Failed to load saved characters." });
    }
  },
);

app.patch(
  "/api/avrae/characters/:characterId/overrides",
  requireTrustedOrigin,
  sessionRateLimiter,
  requireMemberSession,
  async (req, res) => {
    const characterId = req.params.characterId;
    if (typeof characterId !== "string" || !characterId.trim()) {
      res.status(400).json({ error: "Invalid character id." });
      return;
    }
    const { hpOverride, acOverride } = req.body ?? {};
    const hpVal = hpOverride != null ? parseInt(hpOverride, 10) : null;
    const acVal = acOverride != null ? parseInt(acOverride, 10) : null;
    const patch = {};
    if (hpOverride !== undefined) patch.hpOverride = !isNaN(hpVal) && hpVal > 0 ? hpVal : null;
    if (acOverride !== undefined) patch.acOverride = !isNaN(acVal) && acVal > 0 ? acVal : null;
    try {
      const updated = await updateAvraeCharacterOverrides({
        userId: req.memberUser.id,
        characterId,
        ...patch,
      });
      if (!updated) {
        res.status(404).json({ error: "Character not found." });
        return;
      }
      res.json({ character: updated });
    } catch (err) {
      console.error("Failed to update character overrides:", err);
      res.status(500).json({ error: "Failed to save overrides." });
    }
  },
);

app.delete(
  "/api/avrae/characters/:characterId",
  requireTrustedOrigin,
  sessionRateLimiter,
  requireMemberSession,
  async (req, res) => {
    const characterId = req.params.characterId;
    if (typeof characterId !== "string" || !characterId.trim()) {
      res.status(400).json({ error: "Invalid character id." });
      return;
    }

    try {
      const deleted = await deleteSavedAvraeCharacter({
        userId: req.memberUser.id,
        characterId: characterId.trim(),
      });

      if (!deleted) {
        res.status(404).json({ error: "Saved character not found." });
        return;
      }

      res.status(204).end();
    } catch (avraeError) {
      console.error("Failed to delete Avrae character:", avraeError);
      res.status(500).json({ error: "Failed to remove saved character." });
    }
  },
);

app.get(
  "/api/avrae/discord-message",
  sessionRateLimiter,
  requireMemberSession,
  async (req, res) => {
    const url = typeof req.query.url === "string" ? req.query.url.trim() : "";
    if (!url) {
      res.status(400).json({ error: "Discord message URL is required." });
      return;
    }

    const match = url.match(/\/channels\/\d+\/(\d+)\/(\d+)/);
    if (!match) {
      res.status(400).json({ error: "Invalid Discord message URL." });
      return;
    }

    const [, channelId, messageId] = match;

    try {
      const message = await fetchDiscordMessage(channelId, messageId);
      const embedTexts = (message.embeds || []).map((embed) => [
        embed.title || "",
        embed.description || "",
        ...(embed.fields || []).map((f) => `${f.name}\n${f.value}`),
      ].join("\n")).join("\n");
      res.json({
        content: [typeof message.content === "string" ? message.content : "", embedTexts].filter(Boolean).join("\n"),
      });
    } catch (discordError) {
      const statusCode = Number(discordError.statusCode) || 500;
      res.status(statusCode).json({
        error: discordError instanceof Error ? discordError.message : "Failed to fetch Discord message.",
      });
    }
  },
);

app.get(
  "/api/avrae/modifiers",
  sessionRateLimiter,
  requireMemberSession,
  async (req, res) => {
    try {
      const modifiers = await listSavedAvraeModifiers(req.memberUser.id);
      res.json({ modifiers });
    } catch (avraeError) {
      console.error("Failed to list Avrae modifiers:", avraeError);
      res.status(500).json({ error: "Failed to load saved modifiers." });
    }
  },
);

app.post(
  "/api/avrae/modifiers",
  requireTrustedOrigin,
  sessionRateLimiter,
  requireMemberSession,
  async (req, res) => {
    const normalized = normalizeModifierPayload(req.body);
    if ("error" in normalized) {
      res.status(400).json({ error: normalized.error });
      return;
    }

    try {
      const modifier = await createSavedAvraeModifier({
        userId: req.memberUser.id,
        modifier: normalized,
      });
      res.status(201).json({ modifier });
    } catch (avraeError) {
      console.error("Failed to create Avrae modifier:", avraeError);
      res.status(500).json({ error: "Failed to save modifier." });
    }
  },
);

app.patch(
  "/api/avrae/modifiers/:modifierId",
  requireTrustedOrigin,
  sessionRateLimiter,
  requireMemberSession,
  async (req, res) => {
    const modifierId = Number(req.params.modifierId);
    if (!Number.isInteger(modifierId) || modifierId <= 0) {
      res.status(400).json({ error: "Invalid modifier id." });
      return;
    }

    const normalized = normalizeModifierPayload(req.body);
    if ("error" in normalized) {
      res.status(400).json({ error: normalized.error });
      return;
    }

    try {
      const modifier = await updateSavedAvraeModifier({
        userId: req.memberUser.id,
        modifierId,
        modifier: normalized,
      });
      if (!modifier) {
        res.status(404).json({ error: "Modifier not found." });
        return;
      }
      res.json({ modifier });
    } catch (avraeError) {
      console.error("Failed to update Avrae modifier:", avraeError);
      res.status(500).json({ error: "Failed to update modifier." });
    }
  },
);

app.delete(
  "/api/avrae/modifiers/:modifierId",
  requireTrustedOrigin,
  sessionRateLimiter,
  requireMemberSession,
  async (req, res) => {
    const modifierId = Number(req.params.modifierId);
    if (!Number.isInteger(modifierId) || modifierId <= 0) {
      res.status(400).json({ error: "Invalid modifier id." });
      return;
    }

    try {
      const deleted = await deleteSavedAvraeModifier({
        userId: req.memberUser.id,
        modifierId,
      });
      if (!deleted) {
        res.status(404).json({ error: "Modifier not found." });
        return;
      }
      res.status(204).end();
    } catch (avraeError) {
      console.error("Failed to delete Avrae modifier:", avraeError);
      res.status(500).json({ error: "Failed to delete modifier." });
    }
  },
);

app.get(
  "/api/stat-rolls",
  sessionRateLimiter,
  async (req, res) => {
    try {
      const statRolls = await listStatRollSets();
      res.json({ statRolls });
    } catch (err) {
      console.error("Failed to list stat roll sets:", err);
      res.status(500).json({ error: "Failed to load stat rolls." });
    }
  },
);

app.post(
  "/api/stat-rolls/:id/claim",
  requireTrustedOrigin,
  sessionRateLimiter,
  requireMemberSession,
  async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid stat roll id." });
      return;
    }
    try {
      const claimed = await claimStatRollSet({
        id,
        discordUserId: req.memberUser.discordUserId,
      });
      if (!claimed) {
        res.status(409).json({ error: "Stat roll not found or already claimed." });
        return;
      }
      res.json({ statRoll: claimed });
      if (claimed.discordMessageUrl) {
        updateDiscordStatMessage(claimed.discordMessageUrl).catch((err) =>
          console.error("Failed to update Discord stat roll message:", err),
        );
      }
    } catch (err) {
      if (err.locked) {
        res.status(403).json({ error: err.message });
        return;
      }
      console.error("Failed to claim stat roll set:", err);
      res.status(500).json({ error: "Failed to claim stat roll." });
    }
  },
);

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

async function listFaqRows() {
  const result = await pool.query(
    `
    SELECT
      c.id AS category_id,
      c.name AS category_name,
      c.description AS category_description,
      e.id AS entry_id,
      e.question,
      e.answer
    FROM faq_categories c
    LEFT JOIN faq_entries e
      ON e.category_id = c.id
      AND e.is_published = true
    ORDER BY
      c.sort_order ASC,
      LOWER(c.name) ASC,
      e.sort_order ASC NULLS LAST,
      e.id ASC NULLS LAST
    `,
  );

  const categories = new Map();
  for (const row of result.rows) {
    const categoryId = Number(row.category_id);
    if (!categories.has(categoryId)) {
      categories.set(categoryId, {
        id: String(categoryId),
        name: row.category_name,
        description: row.category_description || "",
        entries: [],
      });
    }

    if (row.entry_id) {
      categories.get(categoryId).entries.push({
        id: String(row.entry_id),
        question: row.question,
        answer: row.answer,
      });
    }
  }

  return [...categories.values()];
}

function faqCategoriesToMarkdown(categories) {
  const lines = [
    "---",
    "title: FAQ",
    "---",
    "",
    "# Frequently Asked Questions",
    "",
    'This should be your first port of call to check for answers to questions you have. It will be updated as more questions become "frequent".',
  ];

  for (const category of categories) {
    lines.push("", `## ${category.name}`, "");
    if (category.description) {
      lines.push(category.description.trim(), "");
    }

    for (const entry of category.entries) {
      lines.push(`### ${entry.question}`, "", entry.answer.trim(), "");
    }
  }

  return `${lines.join("\n").trim()}\n`;
}

async function replaceFaqFromMarkdown(markdown) {
  const categories = parseFaqMarkdown(markdown);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM faq_entries");
    await client.query("DELETE FROM faq_categories");

    for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex += 1) {
      const category = categories[categoryIndex];
      const categoryResult = await client.query(
        `
        INSERT INTO faq_categories (name, description, sort_order)
        VALUES ($1, $2, $3)
        RETURNING id
        `,
        [category.name, category.description || "", (categoryIndex + 1) * 10],
      );
      const categoryId = categoryResult.rows[0].id;

      for (let entryIndex = 0; entryIndex < category.entries.length; entryIndex += 1) {
        const entry = category.entries[entryIndex];
        await client.query(
          `
          INSERT INTO faq_entries (
            category_id,
            question,
            answer,
            sort_order,
            is_published
          )
          VALUES ($1, $2, $3, $4, true)
          `,
          [categoryId, entry.question, entry.answer, (entryIndex + 1) * 10],
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return listFaqRows();
}

app.get("/api/faq", async (_req, res) => {
  try {
    const categories = await listFaqRows();
    res.json({
      markdown: faqCategoriesToMarkdown(categories),
      categories,
    });
  } catch (faqError) {
    console.error("Failed to load FAQ content:", faqError);
    res.status(500).json({ error: "Failed to load FAQ content." });
  }
});

app.patch("/api/admin/faq", async (req, res) => {
  const { markdown } = req.body ?? {};

  if (typeof markdown !== "string" || !markdown.trim()) {
    res.status(400).json({ error: "FAQ markdown is required." });
    return;
  }

  try {
    const categories = await replaceFaqFromMarkdown(markdown);
    await recordAuditEvent({
      action: "faq_update",
      status: "success",
      userId: req.staffUser.id,
      discordUserId: req.staffUser.discordUserId,
      metadata: {},
      ...getRequestMetadata(req),
    });

    res.json({
      markdown: faqCategoriesToMarkdown(categories),
      categories,
    });
  } catch (faqError) {
    console.error("Failed to update FAQ content:", faqError);
    res.status(500).json({ error: "Failed to update FAQ content." });
  }
});

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

function normalizeSourcebookPayload(body) {
  const {
    listType,
    title,
    publisher,
    type,
    edition,
    isPublished,
  } = body ?? {};

  if (
    !["allowed", "not_allowed"].includes(listType) ||
    typeof title !== "string" ||
    !title.trim()
  ) {
    return {
      error: "listType and title are required.",
    };
  }

  return {
    listType,
    title: title.trim(),
    publisher: typeof publisher === "string" ? publisher.trim() : "",
    type: typeof type === "string" ? type.trim() : "",
    edition: typeof edition === "string" ? edition.trim() : "",
    sortOrder: 0,
    isPublished: isPublished !== false,
  };
}

function groupSourcebooks(entries) {
  return {
    allowed: entries.filter((entry) => entry.listType === "allowed"),
    notAllowed: entries.filter((entry) => entry.listType === "not_allowed"),
  };
}

function groupBannedContent(entries) {
  const groups = new Map();

  for (const entry of entries) {
    const groupKey = entry.sourcebookId;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        sourcebookId: entry.sourcebookId,
        sourcebookTitle: entry.sourcebookTitle,
        sourcebookPublisher: entry.sourcebookPublisher,
        sourcebookEdition: entry.sourcebookEdition,
        entries: [],
      });
    }

    groups.get(groupKey).entries.push(entry);
  }

  return Array.from(groups.values());
}

function normalizeBannedContentPayload(body) {
  const {
    sourcebookId,
    contentType,
    title,
    notes,
    sortOrder,
    isPublished,
  } = body ?? {};

  if (
    !Number.isInteger(sourcebookId) ||
    sourcebookId <= 0 ||
    typeof title !== "string" ||
    !title.trim()
  ) {
    return {
      error: "sourcebookId and title are required.",
    };
  }

  const parsedSortOrder =
    typeof sortOrder === "number" && Number.isFinite(sortOrder)
      ? Math.trunc(sortOrder)
      : 0;

  return {
    sourcebookId,
    contentType: typeof contentType === "string" ? contentType.trim() : "",
    title: title.trim(),
    notes: typeof notes === "string" ? notes.trim() : "",
    sortOrder: parsedSortOrder,
    isPublished: isPublished !== false,
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

async function normalizeWestMarchesRewardEntry(body) {
  const {
    characterId,
    experience,
    gold,
    sc,
    reason,
    discordId,
    eventRelated,
    adventureId,
  } = body ?? {};

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

    const eventCurrency = await getEventCurrencyMapping();
    if (eventCurrency?.id) {
      currencies[eventCurrency.id] = eventRelated
        ? normalizedSc
        : Math.floor(normalizedSc / 2);
    }
  }

  return {
    characterId: characterId.trim(),
    ...(normalizedExperience > 0 ? { experience: normalizedExperience } : {}),
    ...(Object.keys(currencies).length > 0 ? { currencies } : {}),
    reason:
      typeof reason === "string" && reason.trim()
        ? reason.trim().slice(0, 500)
        : "Rewards calculator submission",
    ...(typeof discordId === "string" && discordId.trim()
      ? { discordId: discordId.trim() }
      : {}),
    ...(typeof adventureId === "string" && adventureId.trim()
      ? { adventureId: adventureId.trim() }
      : {}),
  };
}

async function normalizeWestMarchesRewardBatchPayload(body) {
  const { characterIds, experience, gold, sc, reason, eventRelated, adventureId } =
    body ?? {};

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
  const normalizedRewardEntry = await normalizeWestMarchesRewardEntry({
    characterId: firstCharacterId,
    experience,
    gold,
    sc,
    reason,
    eventRelated,
    adventureId,
  });

  if (normalizedRewardEntry.error) {
    return normalizedRewardEntry;
  }

  return {
    adventureId: normalizedRewardEntry.adventureId || "",
    characterIds: [
      ...new Set(characterIds.map((characterId) => characterId.trim())),
    ],
    reward: {
      ...(typeof normalizedRewardEntry.experience === "number"
        ? { experience: normalizedRewardEntry.experience }
        : {}),
      ...(normalizedRewardEntry.currencies
        ? { currencies: normalizedRewardEntry.currencies }
        : {}),
      reason: normalizedRewardEntry.reason,
      ...(normalizedRewardEntry.discordId
        ? { discordId: normalizedRewardEntry.discordId }
        : {}),
    },
  };
}

async function normalizeWestMarchesBulkRewardsPayload(body) {
  const topLevelAdventureId =
    typeof body?.adventureId === "string" && body.adventureId.trim()
      ? body.adventureId.trim()
      : "";

  if (Array.isArray(body?.rewards)) {
    if (body.rewards.length === 0) {
      return { error: "rewards must contain at least one reward entry." };
    }

    const rewards = [];
    let adventureId = topLevelAdventureId;

    for (const rewardBody of body.rewards) {
      const normalizedReward = await normalizeWestMarchesRewardEntry(rewardBody);

      if (normalizedReward.error) {
        return normalizedReward;
      }

      rewards.push(normalizedReward);
      if (!adventureId && normalizedReward.adventureId) {
        adventureId = normalizedReward.adventureId;
      }
    }

    return { rewards, adventureId };
  }

  const normalizedBatchPayload =
    await normalizeWestMarchesRewardBatchPayload(body);

  if (!normalizedBatchPayload.error) {
    return {
      adventureId: normalizedBatchPayload.adventureId || topLevelAdventureId,
      rewards: normalizedBatchPayload.characterIds.map((characterId) => ({
        characterId,
        ...normalizedBatchPayload.reward,
      })),
    };
  }

  const normalizedReward = await normalizeWestMarchesRewardEntry(body);

  if (normalizedReward.error) {
    return normalizedBatchPayload;
  }

  return {
    adventureId: normalizedReward.adventureId || topLevelAdventureId,
    rewards: [normalizedReward],
  };
}

function truncateEmbedDescription(value) {
  if (value.length <= 4096) {
    return value;
  }

  return `${value.slice(0, 4093)}...`;
}

function formatCalendarAnnouncementDate(date) {
  const normalizedDate =
    typeof date === "string" && date.length >= 10
      ? `${date.slice(0, 10)}T00:00:00Z`
      : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(normalizedDate));
}

function formatCalendarAnnouncementDateRange(startDate, endDate) {
  if (startDate === endDate) {
    return formatCalendarAnnouncementDate(startDate);
  }

  return `${formatCalendarAnnouncementDate(startDate)} to ${formatCalendarAnnouncementDate(endDate)}`;
}

function buildCalendarAnnouncementDescription(event) {
  const description =
    typeof event.details === "string" ? event.details.trim() : "";

  return truncateEmbedDescription(description || "No description provided.");
}

function buildCalendarAnnouncementPayload(event) {
  return {
    embeds: [
      {
        title: event.title,
        color: 0x5d8f78,
        description: buildCalendarAnnouncementDescription(event),
        fields: [
          {
            name: "Dates",
            value: formatCalendarAnnouncementDateRange(
              event.startDate,
              event.endDate,
            ),
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
    allowed_mentions: {
      parse: [],
    },
  };
}

async function notifyCalendarAnnouncement(event) {
  if (!calendarAnnouncementChannelId) {
    return;
  }

  await postChannelMessage(
    calendarAnnouncementChannelId,
    buildCalendarAnnouncementPayload(event),
  );
}

function normalizeAnnouncementRoleIds(roleIds) {
  if (!Array.isArray(roleIds)) {
    return [];
  }

  return [...new Set(
    roleIds.filter(
      (roleId) => typeof roleId === "string" && /^\d+$/.test(roleId.trim()),
    ).map((roleId) => roleId.trim()),
  )];
}

function findAnnouncementSplitIndex(content, maxLength) {
  if (content.length <= maxLength) {
    return content.length;
  }

  const preferredBreaks = ["\n\n", "\n", " "];
  for (const breakText of preferredBreaks) {
    const breakIndex = content.lastIndexOf(breakText, maxLength);
    if (breakIndex > 0) {
      const splitAfterBreak = breakIndex + breakText.length;
      return splitAfterBreak <= maxLength ? splitAfterBreak : breakIndex;
    }
  }

  return maxLength;
}

function splitAnnouncementContent(content, finalReservedLength = 0) {
  const chunks = [];
  let remainingContent = content.trim();

  while (remainingContent.length > 0) {
    const isFinalChunk =
      remainingContent.length + finalReservedLength <= DISCORD_MESSAGE_LIMIT;
    const maxLength = isFinalChunk
      ? DISCORD_MESSAGE_LIMIT - finalReservedLength
      : DISCORD_MESSAGE_LIMIT;
    const splitIndex = findAnnouncementSplitIndex(remainingContent, maxLength);
    const chunk = remainingContent.slice(0, splitIndex).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    remainingContent = remainingContent.slice(splitIndex).trim();
  }

  return chunks;
}

function buildTextAnnouncementPayloads(content, roleIds = []) {
  const normalizedRoleIds = normalizeAnnouncementRoleIds(roleIds);
  const roleMentions = normalizedRoleIds
    .map((roleId) => `<@&${roleId}>`)
    .join("\n");
  const finalReservedLength = roleMentions ? roleMentions.length + 1 : 0;

  if (roleMentions && finalReservedLength >= DISCORD_MESSAGE_LIMIT) {
    throw new Error(
      "Selected role pings are too long to fit in one Discord message.",
    );
  }

  const chunks = splitAnnouncementContent(content, finalReservedLength);

  return chunks.map((chunk, index) => {
    const isFinalChunk = index === chunks.length - 1;
    const messageContent = isFinalChunk && roleMentions
      ? `${chunk}\n${roleMentions}`
      : chunk;

    return {
      content: messageContent,
      allowed_mentions: isFinalChunk && normalizedRoleIds.length
        ? {
            parse: [],
            roles: normalizedRoleIds,
          }
        : {
            parse: [],
          },
    };
  });
}

async function notifyTextAnnouncement(content, roleIds = []) {
  if (!calendarAnnouncementChannelId) {
    return;
  }

  const payloads = buildTextAnnouncementPayloads(content, roleIds);
  for (const payload of payloads) {
    await postChannelMessage(calendarAnnouncementChannelId, payload);
  }
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

app.get("/api/wiki-pages/:slug", async (req, res) => {
  const slug = typeof req.params.slug === "string" ? req.params.slug.trim() : "";

  if (!isAllowedWikiPageSlug(slug)) {
    res.status(404).json({ error: "Wiki page not found." });
    return;
  }

  try {
    const page = await getWikiPage(slug);
    res.json({ page });
  } catch (wikiPageError) {
    console.error("Failed to load wiki page:", wikiPageError);
    res.status(500).json({ error: "Failed to load wiki page." });
  }
});

app.get("/api/sourcebooks", async (_req, res) => {
  try {
    const sourcebooks = await listSourcebooks();
    res.json(groupSourcebooks(sourcebooks));
  } catch (sourcebookError) {
    console.error("Failed to load sourcebooks:", sourcebookError);
    res.status(500).json({ error: "Failed to load sourcebooks." });
  }
});

app.get("/api/banned-content", async (_req, res) => {
  try {
    const [sourcebooks, entries] = await Promise.all([
      listSourcebooks(),
      listBannedContentEntries(),
    ]);

    res.json({
      bannedBooks: sourcebooks.filter(
        (sourcebook) => sourcebook.listType === "not_allowed",
      ),
      groups: groupBannedContent(entries),
    });
  } catch (bannedContentError) {
    console.error("Failed to load banned content:", bannedContentError);
    res.status(500).json({ error: "Failed to load banned content." });
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

async function handleGuildRostersRequest(_req, res) {
  try {
    const rosters = await listGuildRosters();
    res.json(rosters);
  } catch (guildRosterError) {
    console.error("Failed to load guild rosters:", guildRosterError);
    res.status(500).json({
      error:
        guildRosterError instanceof Error
          ? guildRosterError.message
          : "Failed to load guild rosters.",
    });
  }
}

app.get("/api/guilds/rosters", requireTrustedOrigin, handleGuildRostersRequest);

app.get(
  "/api/rewards/westmarches/status",
  requireTrustedOrigin,
  async (_req, res) => {
    const eventCurrency = await getEventCurrencyMapping();

    res.json({
      configured: isWestMarchesConfigured(),
      currencyMappings: {
        gold: westMarchesGoldCurrencyId || null,
        sc: westMarchesScCurrencyId || null,
        event: eventCurrency,
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
  "/api/rewards/westmarches/characters/:characterId",
  requireTrustedOrigin,
  requireRewardSubmitSession,
  async (req, res) => {
    if (!isWestMarchesConfigured()) {
      res.status(503).json({ error: "West Marches API is not configured." });
      return;
    }

    const characterId =
      typeof req.params.characterId === "string"
        ? req.params.characterId.trim()
        : "";

    if (!characterId) {
      res.status(400).json({ error: "characterId is required." });
      return;
    }

    try {
      const character = await getCharacter(characterId);
      res.json({ character });
    } catch (westMarchesError) {
      console.error(
        "Failed to load West Marches character detail:",
        westMarchesError,
      );
      res.status(westMarchesError.status || 500).json({
        error:
          westMarchesError instanceof Error
            ? westMarchesError.message
            : "Failed to load West Marches character detail.",
      });
    }
  },
);

app.get(
  "/api/rewards/westmarches/attribute-stats",
  requireTrustedOrigin,
  async (_req, res) => {
    if (!isWestMarchesConfigured()) {
      res.status(503).json({ error: "West Marches API is not configured." });
      return;
    }

    try {
      const stats = await listCharacterAttributeStats();
      res.json(stats);
    } catch (westMarchesError) {
      console.error(
        "Failed to load West Marches attribute statistics:",
        westMarchesError,
      );
      res.status(westMarchesError.status || 500).json({
        error:
          westMarchesError instanceof Error
            ? westMarchesError.message
            : "Failed to load West Marches attribute statistics.",
      });
    }
  },
);

app.get(
  "/api/rewards/westmarches/guild-rosters",
  requireTrustedOrigin,
  handleGuildRostersRequest,
);

app.get(
  "/api/rewards/westmarches/my-characters",
  requireTrustedOrigin,
  sessionRateLimiter,
  requireMemberSession,
  async (req, res) => {
    if (!isWestMarchesConfigured()) {
      res.status(503).json({ error: "West Marches API is not configured." });
      return;
    }

    try {
      const allCharacters = await listAllCharacters();
      const myCharacters = allCharacters.filter(
        (c) => c?.user?.discordId === req.memberUser.discordUserId,
      );
      res.json({
        characters: myCharacters
          .filter((c) => typeof c?.status !== "string" || c.status.toUpperCase() !== "RETIRED")
          .map((c) => ({
            id: c.id,
            name: typeof c.name === "string" ? c.name.trim() : "",
            level: c.level,
            experience: c.experience,
            status: c.status,
            image: c.image,
            user: c.user || null,
          })),
      });
    } catch (westMarchesError) {
      console.error("Failed to load own West Marches characters:", westMarchesError);
      res.status(500).json({ error: "Failed to load your characters." });
    }
  },
);

app.post(
  "/api/rewards/rp",
  requireTrustedOrigin,
  sessionRateLimiter,
  requireMemberSession,
  async (req, res) => {
    if (!isWestMarchesConfigured()) {
      res.status(503).json({ error: "West Marches API is not configured." });
      return;
    }

    const { characterId, experience, gold, reason } = req.body ?? {};

    if (typeof characterId !== "string" || !characterId.trim()) {
      res.status(400).json({ error: "characterId is required." });
      return;
    }

    const normalizedExperience = parseOptionalWholeNumber(experience);
    const normalizedGold = parseOptionalWholeNumber(gold);

    if (normalizedExperience === null || normalizedGold === null) {
      res.status(400).json({ error: "experience and gold must be whole numbers when provided." });
      return;
    }

    if (normalizedExperience < 0 || normalizedGold < 0) {
      res.status(400).json({ error: "Reward values cannot be negative." });
      return;
    }

    if (normalizedExperience === 0 && normalizedGold === 0) {
      res.status(400).json({ error: "At least one reward value must be greater than zero." });
      return;
    }

    let character;
    try {
      character = await getCharacter(characterId.trim());
    } catch {
      res.status(404).json({ error: "Character not found." });
      return;
    }

    if (character?.user?.discordId !== req.memberUser.discordUserId) {
      res.status(403).json({ error: "You can only submit RP rewards for your own characters." });
      return;
    }

    const currencies = {};
    if (normalizedGold > 0) {
      if (!westMarchesGoldCurrencyId) {
        res.status(503).json({ error: "WEST_MARCHES_GOLD_CURRENCY_ID is required to award gold rewards." });
        return;
      }
      currencies[westMarchesGoldCurrencyId] = normalizedGold;
    }

    const normalizedReason = typeof reason === "string" && reason.trim()
      ? reason.trim().slice(0, 500)
      : `RP rewards submission`;

    const rewardPayload = {
      rewards: [{
        characterId: characterId.trim(),
        ...(normalizedExperience > 0 ? { experience: normalizedExperience } : {}),
        ...(Object.keys(currencies).length > 0 ? { currencies } : {}),
        reason: normalizedReason,
      }],
    };

    try {
      const rewards = await distributeRewards(rewardPayload);
      await recordAuditEvent({
        action: "rp_reward_submit",
        status: "success",
        userId: req.memberUser.id,
        discordUserId: req.memberUser.discordUserId,
        metadata: { characterId: characterId.trim(), experience: normalizedExperience, gold: normalizedGold },
        ...getRequestMetadata(req),
      });
      res.status(201).json({ reward: rewards[0] });
    } catch (westMarchesError) {
      console.error("Failed to submit RP reward:", westMarchesError);
      await recordAuditEvent({
        action: "rp_reward_submit",
        status: "error",
        userId: req.memberUser.id,
        discordUserId: req.memberUser.discordUserId,
        metadata: {
          characterId: characterId.trim(),
          error: westMarchesError instanceof Error ? westMarchesError.message : "unknown_error",
        },
        ...getRequestMetadata(req),
      });
      res.status(westMarchesError.status || 500).json({
        error: westMarchesError instanceof Error ? westMarchesError.message : "Failed to submit RP reward.",
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
  "/api/rewards/westmarches/adventures",
  requireTrustedOrigin,
  requireRewardSubmitSession,
  async (req, res) => {
    if (!isWestMarchesConfigured()) {
      res.status(503).json({ error: "West Marches API is not configured." });
      return;
    }

    const limit =
      typeof req.query.limit === "string"
        ? Number.parseInt(req.query.limit, 10)
        : 25;

    try {
      const adventures = await listRecentAdventures({
        pageSize: Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 100) : 25,
      });

      res.json({
        adventures: adventures
          .filter((adventure) => !adventure?.isCancelled)
          .map((adventure) => {
            const participants = Array.isArray(adventure?.participants)
              ? adventure.participants
              : [];
            const approvedCharacterIds = [
              ...new Set(
                participants
                  .filter(
                    (participant) =>
                      typeof participant?.characterId === "string" &&
                      participant.characterId.trim() &&
                      String(participant.status || "").toUpperCase() ===
                        "APPROVED",
                  )
                  .map((participant) => participant.characterId.trim()),
              ),
            ];

            return {
              id: adventure.id,
              title:
                typeof adventure.title === "string"
                  ? adventure.title.trim()
                  : "",
              startTime: adventure.startTime || null,
              endTime: adventure.endTime || null,
              gm: adventure.gm || null,
              approvedCharacterIds,
              participantCount: approvedCharacterIds.length,
            };
          }),
      });
    } catch (westMarchesError) {
      console.error(
        "Failed to load West Marches adventures:",
        westMarchesError,
      );
      res.status(westMarchesError.status || 500).json({
        error:
          westMarchesError instanceof Error
            ? westMarchesError.message
            : "Failed to load West Marches adventures.",
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

    const normalizedPayload = await normalizeWestMarchesBulkRewardsPayload(
      req.body,
    );

    if (normalizedPayload.error) {
      res.status(400).json({ error: normalizedPayload.error });
      return;
    }

    try {
      const rewards = await distributeRewards(normalizedPayload);

      await recordAuditEvent({
        action: "westmarches_reward_distribute_batch",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          characterIds: normalizedPayload.rewards.map(
            (reward) => reward.characterId,
          ),
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
          characterIds: normalizedPayload.rewards.map(
            (reward) => reward.characterId,
          ),
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

    const normalizedPayload = await normalizeWestMarchesBulkRewardsPayload(
      req.body,
    );

    if (normalizedPayload.error) {
      res.status(400).json({ error: normalizedPayload.error });
      return;
    }

    try {
      const rewards = await distributeRewards(normalizedPayload);
      const [reward] = rewards;

      await recordAuditEvent({
        action: "westmarches_reward_distribute",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          characterIds: normalizedPayload.rewards.map(
            (entry) => entry.characterId,
          ),
          rewards,
        },
        ...getRequestMetadata(req),
      });

      res.status(201).json(
        normalizedPayload.rewards.length === 1 ? { reward } : { rewards },
      );
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
          characterIds: normalizedPayload.rewards.map(
            (entry) => entry.characterId,
          ),
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

      if (grace.isPublished && startingGracesChannelId) {
        syncStartingGraceToDiscord(grace, startingGracesChannelId).catch((err) =>
          console.error("Failed to sync starting grace to Discord:", err),
        );
      }
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

app.get(
  "/api/admin/discord/roles",
  requireTrustedOrigin,
  adminRateLimiter,
  requireStaffSession,
  async (_req, res) => {
    try {
      const roles = await fetchGuildRoles();
      const normalizedRoles = Array.isArray(roles)
        ? roles
            .filter(
              (role) =>
                role &&
                typeof role.id === "string" &&
                typeof role.name === "string" &&
                role.name !== "@everyone",
            )
            .map((role) => ({
              id: role.id,
              name: role.name.trim(),
              position:
                typeof role.position === "number" ? role.position : 0,
            }))
            .sort(
              (left, right) =>
                right.position - left.position ||
                left.name.localeCompare(right.name, undefined, {
                  sensitivity: "base",
                }),
            )
        : [];

      res.json({ roles: normalizedRoles });
    } catch (discordError) {
      console.error("Failed to load Discord roles:", discordError);
      res.status(500).json({ error: "Failed to load Discord roles." });
    }
  },
);

app.get(
  "/api/admin/sourcebooks",
  requireTrustedOrigin,
  adminRateLimiter,
  requireStaffSession,
  async (_req, res) => {
    try {
      const sourcebooks = await listSourcebooks({ includeUnpublished: true });
      res.json(groupSourcebooks(sourcebooks));
    } catch (sourcebookError) {
      console.error("Failed to load admin sourcebooks:", sourcebookError);
      res.status(500).json({ error: "Failed to load sourcebooks." });
    }
  },
);

app.post(
  "/api/admin/sourcebooks",
  requireTrustedOrigin,
  adminRateLimiter,
  requireStaffSession,
  async (req, res) => {
    const normalizedPayload = normalizeSourcebookPayload(req.body);

    if ("error" in normalizedPayload) {
      res.status(400).json({ error: normalizedPayload.error });
      return;
    }

    try {
      const sourcebook = await createSourcebook({
        ...normalizedPayload,
        createdByUserId: req.staffUser.id,
      });

      await recordAuditEvent({
        action: "sourcebook_create",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          sourcebookId: sourcebook.id,
          listType: sourcebook.listType,
          title: sourcebook.title,
        },
        ...getRequestMetadata(req),
      });

      res.status(201).json({ sourcebook });
    } catch (sourcebookError) {
      console.error("Failed to create sourcebook:", sourcebookError);
      res.status(500).json({ error: "Failed to create sourcebook." });
    }
  },
);

app.patch(
  "/api/admin/sourcebooks/:sourcebookId",
  requireTrustedOrigin,
  adminRateLimiter,
  requireStaffSession,
  async (req, res) => {
    const sourcebookId = Number(req.params.sourcebookId);
    const normalizedPayload = normalizeSourcebookPayload(req.body);

    if (!Number.isInteger(sourcebookId) || sourcebookId <= 0) {
      res.status(400).json({ error: "Invalid sourcebook id." });
      return;
    }

    if ("error" in normalizedPayload) {
      res.status(400).json({ error: normalizedPayload.error });
      return;
    }

    try {
      const sourcebook = await updateSourcebook({
        sourcebookId,
        ...normalizedPayload,
        updatedByUserId: req.staffUser.id,
      });

      if (!sourcebook) {
        res.status(404).json({ error: "Sourcebook not found." });
        return;
      }

      await recordAuditEvent({
        action: "sourcebook_update",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          sourcebookId: sourcebook.id,
          listType: sourcebook.listType,
          title: sourcebook.title,
        },
        ...getRequestMetadata(req),
      });

      res.json({ sourcebook });
    } catch (sourcebookError) {
      console.error("Failed to update sourcebook:", sourcebookError);
      res.status(500).json({ error: "Failed to update sourcebook." });
    }
  },
);

app.delete(
  "/api/admin/sourcebooks/:sourcebookId",
  requireTrustedOrigin,
  adminRateLimiter,
  requireStaffSession,
  async (req, res) => {
    const sourcebookId = Number(req.params.sourcebookId);

    if (!Number.isInteger(sourcebookId) || sourcebookId <= 0) {
      res.status(400).json({ error: "Invalid sourcebook id." });
      return;
    }

    try {
      const deleted = await deleteSourcebook(sourcebookId);

      if (!deleted) {
        res.status(404).json({ error: "Sourcebook not found." });
        return;
      }

      await recordAuditEvent({
        action: "sourcebook_delete",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: { sourcebookId },
        ...getRequestMetadata(req),
      });

      res.status(204).end();
    } catch (sourcebookError) {
      console.error("Failed to delete sourcebook:", sourcebookError);
      res.status(500).json({ error: "Failed to delete sourcebook." });
    }
  },
);

app.get(
  "/api/admin/banned-content",
  requireTrustedOrigin,
  adminRateLimiter,
  requireStaffSession,
  async (_req, res) => {
    try {
      const [sourcebooks, entries] = await Promise.all([
        listSourcebooks({ includeUnpublished: true }),
        listBannedContentEntries({ includeUnpublished: true }),
      ]);

      res.json({
        sourcebooks,
        bannedBooks: sourcebooks.filter(
          (sourcebook) => sourcebook.listType === "not_allowed",
        ),
        groups: groupBannedContent(entries),
        entries,
      });
    } catch (bannedContentError) {
      console.error("Failed to load admin banned content:", bannedContentError);
      res.status(500).json({ error: "Failed to load banned content." });
    }
  },
);

app.post(
  "/api/admin/banned-content/items",
  requireTrustedOrigin,
  adminRateLimiter,
  requireStaffSession,
  async (req, res) => {
    const normalizedPayload = normalizeBannedContentPayload(req.body);

    if ("error" in normalizedPayload) {
      res.status(400).json({ error: normalizedPayload.error });
      return;
    }

    try {
      const entry = await createBannedContentEntry({
        ...normalizedPayload,
        createdByUserId: req.staffUser.id,
      });

      await recordAuditEvent({
        action: "banned_content_create",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          bannedContentId: entry.id,
          sourcebookId: entry.sourcebookId,
          title: entry.title,
        },
        ...getRequestMetadata(req),
      });

      res.status(201).json({ entry });
    } catch (bannedContentError) {
      console.error("Failed to create banned content:", bannedContentError);
      res.status(500).json({ error: "Failed to create banned content." });
    }
  },
);

app.patch(
  "/api/admin/banned-content/items/:bannedContentId",
  requireTrustedOrigin,
  adminRateLimiter,
  requireStaffSession,
  async (req, res) => {
    const bannedContentId = Number(req.params.bannedContentId);
    const normalizedPayload = normalizeBannedContentPayload(req.body);

    if (!Number.isInteger(bannedContentId) || bannedContentId <= 0) {
      res.status(400).json({ error: "Invalid banned content id." });
      return;
    }

    if ("error" in normalizedPayload) {
      res.status(400).json({ error: normalizedPayload.error });
      return;
    }

    try {
      const entry = await updateBannedContentEntry({
        bannedContentId,
        ...normalizedPayload,
        updatedByUserId: req.staffUser.id,
      });

      if (!entry) {
        res.status(404).json({ error: "Banned content not found." });
        return;
      }

      await recordAuditEvent({
        action: "banned_content_update",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          bannedContentId: entry.id,
          sourcebookId: entry.sourcebookId,
          title: entry.title,
        },
        ...getRequestMetadata(req),
      });

      res.json({ entry });
    } catch (bannedContentError) {
      console.error("Failed to update banned content:", bannedContentError);
      res.status(500).json({ error: "Failed to update banned content." });
    }
  },
);

app.delete(
  "/api/admin/banned-content/items/:bannedContentId",
  requireTrustedOrigin,
  adminRateLimiter,
  requireStaffSession,
  async (req, res) => {
    const bannedContentId = Number(req.params.bannedContentId);

    if (!Number.isInteger(bannedContentId) || bannedContentId <= 0) {
      res.status(400).json({ error: "Invalid banned content id." });
      return;
    }

    try {
      const deleted = await deleteBannedContentEntry(bannedContentId);

      if (!deleted) {
        res.status(404).json({ error: "Banned content not found." });
        return;
      }

      await recordAuditEvent({
        action: "banned_content_delete",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: { bannedContentId },
        ...getRequestMetadata(req),
      });

      res.status(204).end();
    } catch (bannedContentError) {
      console.error("Failed to delete banned content:", bannedContentError);
      res.status(500).json({ error: "Failed to delete banned content." });
    }
  },
);

app.post(
  "/api/admin/announcements",
  requireTrustedOrigin,
  adminRateLimiter,
  requireStaffSession,
  async (req, res) => {
    const { content, roleIds, roleId } = req.body ?? {};

    if (typeof content !== "string" || !content.trim()) {
      res.status(400).json({ error: "content is required." });
      return;
    }

    const normalizedContent = content.trim();
    const normalizedRoleIds = normalizeAnnouncementRoleIds(
      Array.isArray(roleIds)
        ? roleIds
        : typeof roleId === "string" && roleId.trim()
          ? [roleId]
          : [],
    );
    if (normalizedContent.length > ANNOUNCEMENT_CONTENT_LIMIT) {
      res.status(400).json({
        error: `content must be ${ANNOUNCEMENT_CONTENT_LIMIT} characters or fewer.`,
      });
      return;
    }

    if (!calendarAnnouncementChannelId) {
      res.status(503).json({
        error: "Announcement channel is not configured.",
      });
      return;
    }

    try {
      await notifyTextAnnouncement(normalizedContent, normalizedRoleIds);

      await recordAuditEvent({
        action: "discord_announcement_create",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          contentLength: normalizedContent.length,
          roleIds: normalizedRoleIds,
          preview: normalizedContent.slice(0, 200),
        },
        ...getRequestMetadata(req),
      });

      res.status(201).json({ ok: true });
    } catch (announcementError) {
      console.error(
        "Failed to post text announcement to Discord:",
        announcementError,
      );

      await recordAuditEvent({
        action: "discord_announcement_create",
        status: "error",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          contentLength: normalizedContent.length,
          roleIds: normalizedRoleIds,
          error:
            announcementError instanceof Error
              ? announcementError.message
              : "unknown_error",
        },
        ...getRequestMetadata(req),
      });

      res.status(500).json({ error: "Failed to post announcement." });
    }
  },
);

app.get(
  "/api/admin/marketplace",
  adminRateLimiter,
  requireStaffSession,
  async (req, res) => {
    try {
      const defaultScheduledFor = getDefaultMarketplaceScheduledFor();
      const marketplaces = await listRecentMarketplaces();

      res.json({
        timeZone: MARKETPLACE_TIME_ZONE,
        defaultScheduledFor: defaultScheduledFor.toISOString(),
        defaultScheduledForLocal: formatZonedLocalInput(defaultScheduledFor),
        marketplaces,
      });
    } catch (marketplaceError) {
      console.error("Failed to load marketplace admin data:", marketplaceError);
      res.status(500).json({ error: "Failed to load marketplace data." });
    }
  },
);

app.post(
  "/api/admin/marketplace/generate",
  requireTrustedOrigin,
  adminRateLimiter,
  requireStaffSession,
  async (req, res) => {
    try {
      const content = await generateMarketplaceContent();
      res.json({ content });
    } catch (marketplaceError) {
      console.error("Failed to generate marketplace:", marketplaceError);
      res.status(500).json({ error: "Failed to generate marketplace." });
    }
  },
);

app.post(
  "/api/admin/marketplace/generate-consumables",
  requireTrustedOrigin,
  adminRateLimiter,
  requireStaffSession,
  async (req, res) => {
    try {
      const content = await generateConsumablesMarketplaceContent();
      res.json({ content });
    } catch (marketplaceError) {
      console.error("Failed to generate consumables marketplace:", marketplaceError);
      res.status(500).json({ error: "Failed to generate consumables marketplace." });
    }
  },
);

app.post(
  "/api/admin/marketplace",
  requireTrustedOrigin,
  adminRateLimiter,
  requireStaffSession,
  async (req, res) => {
    const { content, source, scheduledForLocal } = req.body ?? {};
    const scheduledFor = parseMarketplaceScheduledForLocal(scheduledForLocal);

    if (!scheduledFor) {
      res.status(400).json({
        error: `scheduledForLocal must be a valid ${MARKETPLACE_TIME_ZONE} datetime.`,
      });
      return;
    }

    try {
      const normalizedContent = validateMarketplaceContent(content);
      const marketplace = await createMarketplace({
        source:
          source === "manual" || source === "consumables"
            ? source
            : "generated",
        content: normalizedContent,
        scheduledFor,
        createdByDiscordUserId: req.staffUser.discordUserId,
      });

      await recordAuditEvent({
        action: "marketplace_schedule",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          marketplaceId: marketplace.id,
          source: marketplace.source,
          scheduledFor: scheduledFor.toISOString(),
          contentLength: normalizedContent.length,
        },
        ...getRequestMetadata(req),
      });

      res.status(201).json({ marketplace });
    } catch (marketplaceError) {
      await recordAuditEvent({
        action: "marketplace_schedule",
        status: "error",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          source:
            source === "manual" || source === "consumables"
              ? source
              : "generated",
          scheduledFor: scheduledFor.toISOString(),
          error:
            marketplaceError instanceof Error
              ? marketplaceError.message
              : "unknown_error",
        },
        ...getRequestMetadata(req),
      });

      res.status(400).json({
        error:
          marketplaceError instanceof Error
            ? marketplaceError.message
            : "Failed to schedule marketplace.",
      });
    }
  },
);

app.post(
  "/api/admin/calendar",
  requireTrustedOrigin,
  adminRateLimiter,
  requireStaffSession,
  async (req, res) => {
    const { title, startDate, endDate, category, summary, details, announce } =
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

      if (announce === true) {
        try {
          await notifyCalendarAnnouncement(event);
        } catch (discordError) {
          console.error(
            "Failed to post calendar announcement to Discord:",
            discordError,
          );
        }
      }

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
  "/api/admin/wiki-pages/:slug",
  requireTrustedOrigin,
  adminRateLimiter,
  requireStaffSession,
  async (req, res) => {
    const slug =
      typeof req.params.slug === "string" ? req.params.slug.trim() : "";
    const { title, markdown } = req.body ?? {};

    if (!isAllowedWikiPageSlug(slug)) {
      res.status(404).json({ error: "Wiki page not found." });
      return;
    }

    if (typeof title !== "string" || !title.trim()) {
      res.status(400).json({ error: "title is required." });
      return;
    }

    if (typeof markdown !== "string" || !markdown.trim()) {
      res.status(400).json({ error: "markdown is required." });
      return;
    }

    if (markdown.length > 100000) {
      res.status(400).json({ error: "markdown must be 100000 characters or fewer." });
      return;
    }

    try {
      const page = await upsertWikiPage({
        slug,
        title: title.trim().slice(0, 200),
        markdown: markdown.trim(),
        updatedByUserId: req.staffUser.id,
      });

      await recordAuditEvent({
        action: "wiki_page_update",
        status: "success",
        userId: req.staffUser.id,
        discordUserId: req.staffUser.discordUserId,
        metadata: {
          slug,
          markdownLength: page.markdown.length,
        },
        ...getRequestMetadata(req),
      });

      res.json({ page });

      if (slug === "getting-set-up" && characterCreationChannelId) {
        syncWikiPageToDiscord(page, characterCreationChannelId).catch((err) =>
          console.error("Failed to sync wiki page to Discord:", err),
        );
      }
    } catch (wikiPageError) {
      console.error("Failed to update wiki page:", wikiPageError);
      res.status(500).json({ error: "Failed to update wiki page." });
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

    const revalidatedUser = await revalidateGuildUser(user);
    if (!revalidatedUser) {
      clearSessionCookie(res);
      res.status(401).json({ authenticated: false });
      return;
    }

    res.json({
      authenticated: true,
      user: {
        ...revalidatedUser,
        canSubmitRewards: Boolean(revalidatedUser.isStaff || revalidatedUser.isDm),
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

publishDueMarketplaces({
  defaultChannelId: marketplaceChannelId,
  defaultMessageId: marketplaceMessageId,
  playerRoleId,
  deleteChannelMessage,
  editChannelMessage,
  postChannelMessage,
}).catch((error) => {
  console.error("Initial marketplace publish check failed:", error);
});

setInterval(
  () => {
    deleteExpiredSessions().catch((error) => {
      console.error("Expired session cleanup failed:", error);
    });
  },
  60 * 60 * 1000,
).unref();

setInterval(
  () => {
    publishDueMarketplaces({
      defaultChannelId: marketplaceChannelId,
      defaultMessageId: marketplaceMessageId,
      playerRoleId,
      deleteChannelMessage,
      editChannelMessage,
      postChannelMessage,
    }).catch((error) => {
      console.error("Marketplace publish check failed:", error);
    });
  },
  60 * 1000,
).unref();
