const { pool } = require("./db");

const MARKETPLACE_TIME_ZONE = "Europe/London";
const MARKETPLACE_MESSAGE_LIMIT = 2000;
const MARKETPLACE_RARITIES = [
  { value: "common", label: "Common" },
  { value: "uncommon", label: "Uncommon" },
  { value: "rare", label: "Rare" },
  { value: "veryrare", label: "Very Rare" },
];

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

async function generateMarketplaceContent() {
  const result = await pool.query(
    `
    WITH ranked_items AS (
      SELECT
        rarity,
        name,
        ROW_NUMBER() OVER (PARTITION BY rarity ORDER BY RANDOM()) AS rarity_rank
      FROM magic_items
      WHERE rarity = ANY($1)
        AND is_published = TRUE
    )
    SELECT rarity, name
    FROM ranked_items
    WHERE rarity_rank <= 10
    ORDER BY ARRAY_POSITION($1, rarity), name ASC
    `,
    [MARKETPLACE_RARITIES.map((rarity) => rarity.value)],
  );

  const itemsByRarity = new Map(
    MARKETPLACE_RARITIES.map((rarity) => [rarity.value, []]),
  );

  for (const row of result.rows) {
    itemsByRarity.get(row.rarity)?.push(row.name);
  }

  return formatMarketplaceContent(itemsByRarity);
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
  if (!["generated", "manual"].includes(source)) {
    throw new Error("Marketplace source must be generated or manual.");
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
    SELECT discord_channel_id, discord_message_id
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
        discord_message_id
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

      try {
        let message;
        if (messageId) {
          message = await editChannelMessage(channelId, messageId, {
            content: marketplace.content,
            allowed_mentions: { parse: [] },
          });
        } else {
          message = await postChannelMessage(channelId, {
            content: marketplace.content,
            allowed_mentions: { parse: [] },
          });
        }

        await client.query(
          `
          UPDATE weekly_marketplaces
          SET
            status = 'published',
            discord_channel_id = $2,
            discord_message_id = $3,
            published_at = NOW(),
            error_message = NULL,
            updated_at = NOW()
          WHERE id = $1
          `,
          [marketplace.id, channelId, message.id],
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
  generateMarketplaceContent,
  getDefaultMarketplaceScheduledFor,
  listRecentMarketplaces,
  parseMarketplaceScheduledForLocal,
  publishDueMarketplaces,
  validateMarketplaceContent,
};
