const {
  ActionRowBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const pool = require("../db");
const { truncateValue } = require("../utils");

const CURRENCY_LABELS = { gold: "Gold", sc: "SC" };

class DuplicateActiveListingError extends Error {
  constructor() {
    super("duplicate_active_listing");
  }
}

function mapListingRow(row) {
  return row
    ? {
        id: row.id,
        sellerDiscordUserId: row.seller_discord_user_id,
        sellerCharacterId: row.seller_character_id,
        sellerCharacterName: row.seller_character_name,
        itemId: row.item_id,
        itemName: row.item_name,
        itemDescription: row.item_description,
        quantity: row.quantity,
        priceGold: row.price_gold,
        priceSc: row.price_sc,
        status: row.status,
        failureReason: row.failure_reason,
        createdAt: row.created_at,
      }
    : null;
}

function mapRequestRow(row) {
  return row
    ? {
        id: row.id,
        requesterDiscordUserId: row.requester_discord_user_id,
        requesterCharacterId: row.requester_character_id,
        requesterCharacterName: row.requester_character_name,
        itemName: row.item_name,
        quantity: row.quantity,
        offerPriceGold: row.offer_price_gold,
        offerPriceSc: row.offer_price_sc,
        status: row.status,
        failureReason: row.failure_reason,
        createdAt: row.created_at,
      }
    : null;
}

function formatPrice(priceGold, priceSc) {
  const parts = [];
  if (priceGold !== null && priceGold !== undefined) {
    parts.push(`${priceGold} ${CURRENCY_LABELS.gold}`);
  }
  if (priceSc !== null && priceSc !== undefined) {
    parts.push(`${priceSc} ${CURRENCY_LABELS.sc}`);
  }
  return parts.join(" / ");
}

function formatListingPrice(listing) {
  return formatPrice(listing.priceGold, listing.priceSc);
}

function formatRequestPrice(request) {
  return formatPrice(request.offerPriceGold, request.offerPriceSc);
}

function getCharacterInventory(character) {
  if (Array.isArray(character?.inventoryItems)) return character.inventoryItems;
  return [];
}

async function createListing({
  sellerUserId = null,
  sellerDiscordUserId,
  sellerCharacterId,
  sellerCharacterName,
  itemId,
  itemName,
  itemDescription,
  quantity,
  priceGold = null,
  priceSc = null,
}) {
  try {
    const result = await pool.query(
      `
      INSERT INTO player_marketplace_listings (
        seller_user_id, seller_discord_user_id, seller_character_id, seller_character_name,
        item_id, item_name, item_description, quantity, price_gold, price_sc
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
      `,
      [
        sellerUserId,
        sellerDiscordUserId,
        sellerCharacterId,
        sellerCharacterName,
        itemId,
        itemName,
        itemDescription || null,
        quantity,
        priceGold,
        priceSc,
      ],
    );
    return mapListingRow(result.rows[0]);
  } catch (error) {
    if (error?.code === "23505") {
      throw new DuplicateActiveListingError();
    }
    throw error;
  }
}

async function cancelListing({ listingId, requestingDiscordUserId }) {
  const result = await pool.query(
    `
    UPDATE player_marketplace_listings
    SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
    WHERE id = $1 AND status = 'active' AND seller_discord_user_id = $2
    RETURNING *
    `,
    [listingId, requestingDiscordUserId],
  );
  return mapListingRow(result.rows[0]);
}

async function listActiveListingsForCharacter(characterId) {
  const result = await pool.query(
    `SELECT * FROM player_marketplace_listings WHERE seller_character_id = $1 AND status = 'active'`,
    [characterId],
  );
  return result.rows.map(mapListingRow);
}

async function findActiveListingByCharacterAndItem(characterId, itemId) {
  const result = await pool.query(
    `SELECT * FROM player_marketplace_listings WHERE seller_character_id = $1 AND item_id = $2 AND status = 'active' LIMIT 1`,
    [characterId, itemId],
  );
  return mapListingRow(result.rows[0]);
}

async function listActiveListingsForDiscordUser(discordUserId) {
  const result = await pool.query(
    `SELECT * FROM player_marketplace_listings WHERE seller_discord_user_id = $1 AND status = 'active' ORDER BY created_at DESC`,
    [discordUserId],
  );
  return result.rows.map(mapListingRow);
}

function buildSellCharacterRow(discordUserId, characters) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`sell-character-pick:${discordUserId}`)
    .setPlaceholder("Choose which character is selling...")
    .addOptions(
      characters.slice(0, 25).map((character) => ({
        label: truncateValue(character.name, 100),
        description: `Level ${character.level || "unknown"}`.slice(0, 100),
        value: character.id,
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildSellItemRow(discordUserId, characterId, items) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`sell-item-pick:${discordUserId}:${characterId}`)
    .setPlaceholder("Choose an item to sell...")
    .addOptions(
      items.slice(0, 25).map((item) => ({
        label: truncateValue(item.name, 100),
        description: `Qty remaining: ${item.remainingQty ?? item.quantity ?? 1}`.slice(0, 100),
        value: item.id,
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildSellPriceModal(discordUserId, characterId, itemId, itemName) {
  const modal = new ModalBuilder()
    .setCustomId(`sell-price-modal:${discordUserId}:${characterId}:${itemId}`)
    .setTitle(truncateValue(`Sell ${itemName}`, 45));

  const quantityInput = new TextInputBuilder()
    .setCustomId("sell-quantity")
    .setLabel("Quantity to sell (default 1)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(6);

  const goldInput = new TextInputBuilder()
    .setCustomId("sell-price-gold")
    .setLabel("Price per unit in Gold (optional)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(10);

  const scInput = new TextInputBuilder()
    .setCustomId("sell-price-sc")
    .setLabel("Price per unit in SC (optional)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(10);

  modal.addComponents(
    new ActionRowBuilder().addComponents(quantityInput),
    new ActionRowBuilder().addComponents(goldInput),
    new ActionRowBuilder().addComponents(scInput),
  );
  return modal;
}

function buildCancelListingRow(discordUserId, listings) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`sell-cancel-pick:${discordUserId}`)
    .setPlaceholder("Choose a listing to cancel...")
    .addOptions(
      listings.slice(0, 25).map((listing) => ({
        label: truncateValue(`${listing.itemName} (${listing.sellerCharacterName})`, 100),
        description: formatListingPrice(listing).slice(0, 100),
        value: String(listing.id),
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

async function createRequest({
  requesterUserId = null,
  requesterDiscordUserId,
  requesterCharacterId,
  requesterCharacterName,
  itemName,
  quantity,
  offerPriceGold = null,
  offerPriceSc = null,
}) {
  const result = await pool.query(
    `
    INSERT INTO player_marketplace_requests (
      requester_user_id, requester_discord_user_id, requester_character_id, requester_character_name,
      item_name, quantity, offer_price_gold, offer_price_sc
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
    `,
    [
      requesterUserId,
      requesterDiscordUserId,
      requesterCharacterId,
      requesterCharacterName,
      itemName,
      quantity,
      offerPriceGold,
      offerPriceSc,
    ],
  );
  return mapRequestRow(result.rows[0]);
}

async function cancelRequest({ requestId, requestingDiscordUserId }) {
  const result = await pool.query(
    `
    UPDATE player_marketplace_requests
    SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
    WHERE id = $1 AND status = 'open' AND requester_discord_user_id = $2
    RETURNING *
    `,
    [requestId, requestingDiscordUserId],
  );
  return mapRequestRow(result.rows[0]);
}

async function listOpenRequestsForDiscordUser(discordUserId) {
  const result = await pool.query(
    `SELECT * FROM player_marketplace_requests WHERE requester_discord_user_id = $1 AND status = 'open' ORDER BY created_at DESC`,
    [discordUserId],
  );
  return result.rows.map(mapRequestRow);
}

function buildRequestCharacterRow(discordUserId, characters) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`request-character-pick:${discordUserId}`)
    .setPlaceholder("Choose which character is requesting...")
    .addOptions(
      characters.slice(0, 25).map((character) => ({
        label: truncateValue(character.name, 100),
        description: `Level ${character.level || "unknown"}`.slice(0, 100),
        value: character.id,
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildRequestModal(discordUserId, characterId) {
  const modal = new ModalBuilder()
    .setCustomId(`request-modal:${discordUserId}:${characterId}`)
    .setTitle("Request an item");

  const itemNameInput = new TextInputBuilder()
    .setCustomId("request-item-name")
    .setLabel("Item name")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(200);

  const quantityInput = new TextInputBuilder()
    .setCustomId("request-quantity")
    .setLabel("Quantity wanted (default 1)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(6);

  const goldInput = new TextInputBuilder()
    .setCustomId("request-price-gold")
    .setLabel("Offer per unit in Gold (optional)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(10);

  const scInput = new TextInputBuilder()
    .setCustomId("request-price-sc")
    .setLabel("Offer per unit in SC (optional)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(10);

  modal.addComponents(
    new ActionRowBuilder().addComponents(itemNameInput),
    new ActionRowBuilder().addComponents(quantityInput),
    new ActionRowBuilder().addComponents(goldInput),
    new ActionRowBuilder().addComponents(scInput),
  );
  return modal;
}

function buildCancelRequestRow(discordUserId, requests) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`request-cancel-pick:${discordUserId}`)
    .setPlaceholder("Choose a request to cancel...")
    .addOptions(
      requests.slice(0, 25).map((request) => ({
        label: truncateValue(
          `${request.itemName} (${request.requesterCharacterName})`,
          100,
        ),
        description: formatRequestPrice(request).slice(0, 100),
        value: String(request.id),
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

module.exports = {
  CURRENCY_LABELS,
  DuplicateActiveListingError,
  buildCancelListingRow,
  buildCancelRequestRow,
  buildRequestCharacterRow,
  buildRequestModal,
  buildSellCharacterRow,
  buildSellItemRow,
  buildSellPriceModal,
  cancelListing,
  cancelRequest,
  createListing,
  createRequest,
  findActiveListingByCharacterAndItem,
  formatListingPrice,
  formatRequestPrice,
  getCharacterInventory,
  listActiveListingsForCharacter,
  listActiveListingsForDiscordUser,
  listOpenRequestsForDiscordUser,
};
