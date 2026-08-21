const DISCORD_MESSAGE_LIMIT = 2000;

function escapeDiscordMarkdown(value) {
  return String(value || "").replace(/([\\`*_{}\[\]()<>#+\-.!|])/g, "\\$1");
}

function formatPrice(listing) {
  const prices = [];
  if (listing.price_gold !== null && listing.price_gold !== undefined) {
    prices.push(`${listing.price_gold} gp`);
  }
  if (listing.price_sc !== null && listing.price_sc !== undefined) {
    prices.push(`${listing.price_sc} SC`);
  }
  return prices.join(" / ");
}

function buildMarketplaceLines(listings, siteUrl) {
  const url = `${String(siteUrl || "https://reachesofaltharion.com").replace(/\/$/, "")}/marketplace`;
  const lines = [
    "# Player Marketplace",
    `Current player listings. [Open the marketplace](${url}) to buy an item.`,
    "",
  ];

  if (listings.length === 0) {
    lines.push("*There is nothing for sale right now.*");
    return lines;
  }

  for (const listing of listings) {
    const quantity = Number(listing.quantity) > 1 ? `${listing.quantity}x ` : "";
    const item = escapeDiscordMarkdown(listing.item_name);
    const seller = escapeDiscordMarkdown(listing.seller_character_name || "Unknown character");
    lines.push(`- **${quantity}${item}** — **${formatPrice(listing)}** each — ${seller}`);
  }

  return lines;
}

function buildRequestLines(requests, siteUrl) {
  const url = `${String(siteUrl || "https://reachesofaltharion.com").replace(/\/$/, "")}/marketplace`;
  const lines = [
    "# Player Requests",
    `Items players are currently looking for. [Open the marketplace](${url}) to fulfil a request.`,
    "",
  ];

  if (requests.length === 0) {
    lines.push("*There are no open player requests right now.*");
    return lines;
  }

  for (const request of requests) {
    const quantity = Number(request.quantity) > 1 ? `${request.quantity}x ` : "";
    const item = escapeDiscordMarkdown(request.item_name);
    const requester = escapeDiscordMarkdown(
      request.requester_character_name || "Unknown character",
    );
    const price = formatPrice({
      price_gold: request.offer_price_gold,
      price_sc: request.offer_price_sc,
    });
    lines.push(`- **${quantity}${item}** — **${price}** each — ${requester}`);
  }

  return lines;
}

function chunkLines(lines) {
  const chunks = [];
  let current = "";
  for (const line of lines) {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length <= DISCORD_MESSAGE_LIMIT) {
      current = candidate;
      continue;
    }
    if (current) chunks.push(current);
    current = line.length <= DISCORD_MESSAGE_LIMIT ? line : `${line.slice(0, DISCORD_MESSAGE_LIMIT - 1)}…`;
  }
  if (current) chunks.push(current);
  return chunks;
}

async function syncPlayerMarketplaceDiscord({
  pool,
  channelId,
  siteUrl,
  postMessage,
  editMessage,
  deleteMessage,
}) {
  return syncDiscordDisplay({
    pool,
    channelId,
    siteUrl,
    postMessage,
    editMessage,
    deleteMessage,
    advisoryLockId: 73421091,
    contentQuery:
      "SELECT * FROM player_marketplace_listings WHERE status = 'active' ORDER BY item_name ASC, created_at ASC",
    stateTable: "player_marketplace_discord_messages",
    buildLines: buildMarketplaceLines,
  });
}

async function syncPlayerRequestsDiscord({
  pool,
  channelId,
  siteUrl,
  postMessage,
  editMessage,
  deleteMessage,
}) {
  return syncDiscordDisplay({
    pool,
    channelId,
    siteUrl,
    postMessage,
    editMessage,
    deleteMessage,
    advisoryLockId: 73421092,
    contentQuery:
      "SELECT * FROM player_marketplace_requests WHERE status = 'open' ORDER BY item_name ASC, created_at ASC",
    stateTable: "player_marketplace_request_discord_messages",
    buildLines: buildRequestLines,
  });
}

async function syncDiscordDisplay({
  pool,
  channelId,
  siteUrl,
  postMessage,
  editMessage,
  deleteMessage,
  advisoryLockId,
  contentQuery,
  stateTable,
  buildLines,
}) {
  if (!channelId) return [];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [advisoryLockId]);
    const [contentResult, stateResult] = await Promise.all([
      client.query(contentQuery),
      client.query(
        `SELECT message_ids FROM ${stateTable} WHERE channel_id = $1`,
        [channelId],
      ),
    ]);
    const chunks = chunkLines(buildLines(contentResult.rows, siteUrl));
    const oldIds = stateResult.rows[0]?.message_ids || [];
    const nextIds = [];

    for (let index = 0; index < chunks.length; index += 1) {
      const payload = { content: chunks[index], allowed_mentions: { parse: [] } };
      let message;
      if (oldIds[index]) {
        try {
          message = await editMessage(channelId, oldIds[index], payload);
        } catch (error) {
          const missingMessage =
            error?.status === 404 ||
            error?.code === 10008 ||
            /(?:^|\s)404(?:\s|$)/.test(String(error?.message || ""));
          if (!missingMessage) throw error;
          message = await postMessage(channelId, payload);
        }
      } else {
        message = await postMessage(channelId, payload);
      }
      nextIds.push(message.id);
    }

    await Promise.all(
      oldIds.slice(chunks.length).map((messageId) =>
        deleteMessage(channelId, messageId).catch(() => {}),
      ),
    );
    await client.query(
      `INSERT INTO ${stateTable} (channel_id, message_ids, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (channel_id) DO UPDATE SET message_ids = EXCLUDED.message_ids, updated_at = NOW()`,
      [channelId, nextIds],
    );
    await client.query("COMMIT");
    return nextIds;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  buildMarketplaceLines,
  buildRequestLines,
  chunkLines,
  syncPlayerMarketplaceDiscord,
  syncPlayerRequestsDiscord,
};
