const { pool } = require("./db");
const { listMarketplaces: listWestMarchesMarketplaces } = require("./westmarches");

const MARKETPLACE_TIME_ZONE = "Europe/London";
const DISCORD_MESSAGE_LIMIT = 2000;
const MARKETPLACE_MESSAGE_LIMIT = 10000;
const MARKETPLACE_ITEMS_PER_RARITY = 10;
const CONSUMABLES_MARKETPLACE_NAME = "Consumables";
const MARKETPLACE_RARITIES = [
  { value: "common", label: "Common" },
  { value: "uncommon", label: "Uncommon" },
  { value: "rare", label: "Rare" },
  { value: "veryrare", label: "Very Rare" },
];
const MARKETPLACE_RARITY_VALUES = new Set(
  MARKETPLACE_RARITIES.map((rarity) => rarity.value),
);

function mapMarketplaceRow(row) {
  return row
    ? {
        id: Number(row.id),
        source: row.source,
        content: row.content,
        scheduledFor: row.scheduled_for,
        status: row.status,
        discordChannelId: row.discord_channel_id,
        discordMessageId: row.discord_message_id,
        discordPingMessageId: row.discord_ping_message_id,
        discordExtraMessageIds: Array.isArray(row.discord_extra_message_ids)
          ? row.discord_extra_message_ids
          : [],
        publishedAt: row.published_at,
        errorMessage: row.error_message,
        createdByDiscordUserId: row.created_by_discord_user_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    : null;
}

function getZonedParts(date, timeZone = MARKETPLACE_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function getTimeZoneOffsetMs(date, timeZone = MARKETPLACE_TIME_ZONE) {
  const parts = getZonedParts(date, timeZone);
  const zonedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return zonedAsUtc - date.getTime();
}

function zonedLocalToUtc({
  year,
  month,
  day,
  hour,
  minute = 0,
  second = 0,
}, timeZone = MARKETPLACE_TIME_ZONE) {
  let utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  for (let index = 0; index < 2; index += 1) {
    const offsetMs = getTimeZoneOffsetMs(utcDate, timeZone);
    utcDate = new Date(
      Date.UTC(year, month - 1, day, hour, minute, second) - offsetMs,
    );
  }

  return utcDate;
}

function formatZonedLocalInput(date, timeZone = MARKETPLACE_TIME_ZONE) {
  const parts = getZonedParts(date, timeZone);
  return `${parts.year.toString().padStart(4, "0")}-${parts.month
    .toString()
    .padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}T${parts.hour
    .toString()
    .padStart(2, "0")}:${parts.minute.toString().padStart(2, "0")}`;
}

function getDefaultMarketplaceScheduledFor(now = new Date()) {
  const localNow = getZonedParts(now, MARKETPLACE_TIME_ZONE);
  const localDate = new Date(
    Date.UTC(localNow.year, localNow.month - 1, localNow.day),
  );
  const dayOfWeek = localDate.getUTCDay();
  let daysUntilSunday = (7 - dayOfWeek) % 7;

  if (
    daysUntilSunday === 0 &&
    (localNow.hour > 12 || (localNow.hour === 12 && localNow.minute > 0))
  ) {
    daysUntilSunday = 7;
  }

  const targetDate = new Date(
    Date.UTC(localNow.year, localNow.month - 1, localNow.day + daysUntilSunday),
  );

  return zonedLocalToUtc({
    year: targetDate.getUTCFullYear(),
    month: targetDate.getUTCMonth() + 1,
    day: targetDate.getUTCDate(),
    hour: 12,
    minute: 0,
  });
}

function parseMarketplaceScheduledForLocal(value) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match.map(Number);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59
  ) {
    return null;
  }

  return zonedLocalToUtc({ year, month, day, hour, minute });
}

function formatMarketplaceContent(itemsByRarity) {
  return MARKETPLACE_RARITIES.map((rarity) => {
    const items = itemsByRarity.get(rarity.value) || [];
    return [rarity.label, ...items].join("\n");
  }).join("\n\n");
}

function chunkDiscordContent(content) {
  const chunks = [];
  let currentChunk = "";

  for (const line of content.split("\n")) {
    const nextChunk = currentChunk ? `${currentChunk}\n${line}` : line;

    if (nextChunk.length <= DISCORD_MESSAGE_LIMIT) {
      currentChunk = nextChunk;
      continue;
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    if (line.length <= DISCORD_MESSAGE_LIMIT) {
      currentChunk = line;
      continue;
    }

    for (let index = 0; index < line.length; index += DISCORD_MESSAGE_LIMIT) {
      chunks.push(line.slice(index, index + DISCORD_MESSAGE_LIMIT));
    }
    currentChunk = "";
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function validateMarketplaceContent(content) {
  const normalizedContent = typeof content === "string" ? content.trim() : "";
  if (!normalizedContent) {
    throw new Error("Marketplace content is required.");
  }

  if (normalizedContent.length > MARKETPLACE_MESSAGE_LIMIT) {
    throw new Error(
      `Marketplace content must be ${MARKETPLACE_MESSAGE_LIMIT} characters or fewer.`,
    );
  }

  return normalizedContent;
}

function normalizeMarketplaceRarity(value) {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
    : "";
}

function getMagicItemMarketplaceRarity(marketplace) {
  const name = typeof marketplace?.name === "string" ? marketplace.name : "";
  const match = name.match(/^Magic Items\s*-\s*(.+)$/i);
  if (!match) {
    return "";
  }

  const rarity = normalizeMarketplaceRarity(match[1]);
  return MARKETPLACE_RARITY_VALUES.has(rarity) ? rarity : "";
}

function pickRandomItems(items, count) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled
    .slice(0, count)
    .sort((left, right) => left.localeCompare(right));
}

async function generateMarketplaceContent() {
  const itemsByRarity = new Map(
    MARKETPLACE_RARITIES.map((rarity) => [rarity.value, []]),
  );
  const seenByRarity = new Map(
    MARKETPLACE_RARITIES.map((rarity) => [rarity.value, new Set()]),
  );

  const marketplaces = await listWestMarchesMarketplaces();

  for (const marketplace of marketplaces) {
    const rarity = getMagicItemMarketplaceRarity(marketplace);
    if (!rarity) {
      continue;
    }

    const items = Array.isArray(marketplace.items) ? marketplace.items : [];

    for (const item of items) {
      const name = typeof item?.name === "string" ? item.name.trim() : "";
      if (!name) {
        continue;
      }

      const normalizedName = name.toLowerCase();
      const seen = seenByRarity.get(rarity);

      if (seen?.has(normalizedName)) {
        continue;
      }

      seen?.add(normalizedName);
      itemsByRarity.get(rarity)?.push(name);
    }
  }

  const totalItems = [...itemsByRarity.values()].reduce(
    (sum, items) => sum + items.length,
    0,
  );

  if (totalItems === 0) {
    throw new Error("No magic item marketplaces were returned by the West Marches API.");
  }

  for (const [rarity, items] of itemsByRarity.entries()) {
    itemsByRarity.set(
      rarity,
      pickRandomItems(items, MARKETPLACE_ITEMS_PER_RARITY),
    );
  }

  return formatMarketplaceContent(itemsByRarity);
}

async function generateConsumablesMarketplaceContent() {
  const marketplaces = await listWestMarchesMarketplaces();
  const consumablesMarketplace = marketplaces.find(
    (marketplace) =>
      typeof marketplace?.name === "string" &&
      marketplace.name.trim().localeCompare(CONSUMABLES_MARKETPLACE_NAME, undefined, {
        sensitivity: "accent",
      }) === 0,
  );

  if (!consumablesMarketplace) {
    throw new Error("The Consumables marketplace was not returned by the West Marches API.");
  }

  const seen = new Set();
  const itemNames = [];
  const items = Array.isArray(consumablesMarketplace.items)
    ? consumablesMarketplace.items
    : [];

  for (const item of items) {
    const name = typeof item?.name === "string" ? item.name.trim() : "";
    const normalizedName = name.toLowerCase();

    if (!name || seen.has(normalizedName)) {
      continue;
    }

    seen.add(normalizedName);
    itemNames.push(name);
  }

  if (itemNames.length === 0) {
    throw new Error("The Consumables marketplace did not contain any items.");
  }

  itemNames.sort((left, right) => left.localeCompare(right));
  return ["Consumables", ...itemNames].join("\n");
}

async function listRecentMarketplaces(limit = 8) {
  const result = await pool.query(
    `
    SELECT
      id,
      source,
      content,
      scheduled_for,
      status,
      discord_channel_id,
      discord_message_id,
      discord_ping_message_id,
      discord_extra_message_ids,
      published_at,
      error_message,
      created_by_discord_user_id,
      created_at,
      updated_at
    FROM weekly_marketplaces
    ORDER BY scheduled_for DESC, id DESC
    LIMIT $1
    `,
    [limit],
  );

  return result.rows.map(mapMarketplaceRow);
}

async function createMarketplace({
  source,
  content,
  scheduledFor,
  createdByDiscordUserId,
}) {
  const normalizedContent = validateMarketplaceContent(content);
  if (!["generated", "manual", "consumables"].includes(source)) {
    throw new Error("Marketplace source must be generated, manual, or consumables.");
  }

  const result = await pool.query(
    `
    INSERT INTO weekly_marketplaces (
      source,
      content,
      scheduled_for,
      created_by_discord_user_id
    )
    VALUES ($1, $2, $3, $4)
    RETURNING
      id,
      source,
      content,
      scheduled_for,
      status,
      discord_channel_id,
      discord_message_id,
      discord_ping_message_id,
      discord_extra_message_ids,
      published_at,
      error_message,
      created_by_discord_user_id,
      created_at,
      updated_at
    `,
    [
      source,
      normalizedContent,
      scheduledFor.toISOString(),
      createdByDiscordUserId || null,
    ],
  );

  return mapMarketplaceRow(result.rows[0]);
}

async function getLatestPublishedMarketplaceTarget(client) {
  const result = await client.query(
    `
    SELECT discord_channel_id, discord_message_id, discord_ping_message_id, discord_extra_message_ids
    FROM weekly_marketplaces
    WHERE status = 'published'
      AND discord_channel_id IS NOT NULL
      AND discord_message_id IS NOT NULL
    ORDER BY published_at DESC NULLS LAST, id DESC
    LIMIT 1
    `,
  );

  return result.rows[0] || null;
}

async function publishDueMarketplaces({
  defaultChannelId,
  defaultMessageId,
  playerRoleId,
  deleteChannelMessage,
  editChannelMessage,
  postChannelMessage,
}) {
  if (!defaultChannelId) {
    return [];
  }

  const client = await pool.connect();
  const published = [];

  try {
    await client.query("BEGIN");
    const dueResult = await client.query(
      `
      SELECT
        id,
        content,
        discord_channel_id,
        discord_message_id,
        discord_ping_message_id
      FROM weekly_marketplaces
      WHERE status = 'scheduled'
        AND scheduled_for <= NOW()
      ORDER BY scheduled_for ASC, id ASC
      FOR UPDATE SKIP LOCKED
      `,
    );

    for (const marketplace of dueResult.rows) {
      const latestTarget = await getLatestPublishedMarketplaceTarget(client);
      const channelId =
        marketplace.discord_channel_id ||
        latestTarget?.discord_channel_id ||
        defaultChannelId;
      const messageId =
        marketplace.discord_message_id ||
        latestTarget?.discord_message_id ||
        defaultMessageId ||
        null;
      const previousPingMessageId =
        latestTarget?.discord_ping_message_id || null;
      const previousExtraMessageIds = Array.isArray(
        latestTarget?.discord_extra_message_ids,
      )
        ? latestTarget.discord_extra_message_ids
        : [];

      try {
        const contentChunks = chunkDiscordContent(marketplace.content);
        let message;
        const extraMessageIds = [];
        let pingMessageId = null;
        if (messageId) {
          message = await editChannelMessage(channelId, messageId, {
            content: contentChunks[0],
            allowed_mentions: { parse: [] },
          });
        } else {
          message = await postChannelMessage(channelId, {
            content: contentChunks[0],
            allowed_mentions: { parse: [] },
          });
        }

        if (deleteChannelMessage) {
          await Promise.all(
            previousExtraMessageIds.map((extraMessageId) =>
              deleteChannelMessage(channelId, extraMessageId).catch(() => {}),
            ),
          );
        }

        for (const contentChunk of contentChunks.slice(1)) {
          const extraMessage = await postChannelMessage(channelId, {
            content: contentChunk,
            allowed_mentions: { parse: [] },
          });
          extraMessageIds.push(extraMessage.id);
        }

        if (playerRoleId) {
          if (previousPingMessageId && deleteChannelMessage) {
            await deleteChannelMessage(channelId, previousPingMessageId).catch(
              () => {},
            );
          }

          const pingMessage = await postChannelMessage(channelId, {
            content: `<@&${playerRoleId}> The marketplace has been updated.`,
            allowed_mentions: {
              parse: [],
              roles: [playerRoleId],
            },
          });
          pingMessageId = pingMessage.id;
        }

        await client.query(
          `
          UPDATE weekly_marketplaces
          SET
            status = 'published',
            discord_channel_id = $2,
            discord_message_id = $3,
            discord_ping_message_id = $4,
            discord_extra_message_ids = $5,
            published_at = NOW(),
            error_message = NULL,
            updated_at = NOW()
          WHERE id = $1
          `,
          [
            marketplace.id,
            channelId,
            message.id,
            pingMessageId,
            JSON.stringify(extraMessageIds),
          ],
        );
        published.push(Number(marketplace.id));
      } catch (error) {
        await client.query(
          `
          UPDATE weekly_marketplaces
          SET
            status = 'error',
            error_message = $2,
            updated_at = NOW()
          WHERE id = $1
          `,
          [
            marketplace.id,
            error instanceof Error ? error.message.slice(0, 1000) : "unknown",
          ],
        );
      }
    }

    await client.query("COMMIT");
    return published;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
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
};
