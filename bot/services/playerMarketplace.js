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
        currencyType: row.currency_type,
        price: row.price,
        status: row.status,
        buyerDiscordUserId: row.buyer_discord_user_id,
        buyerCharacterId: row.buyer_character_id,
        buyerCharacterName: row.buyer_character_name,
        failureReason: row.failure_reason,
        createdAt: row.created_at,
      }
    : null;
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
  currencyType,
  price,
}) {
  try {
    const result = await pool.query(
      `
      INSERT INTO player_marketplace_listings (
        seller_user_id, seller_discord_user_id, seller_character_id, seller_character_name,
        item_id, item_name, item_description, quantity, currency_type, price
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
        currencyType,
        price,
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

function buildSellCurrencyRow(discordUserId, characterId, itemId) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`sell-currency-pick:${discordUserId}:${characterId}:${itemId}`)
    .setPlaceholder("Choose a currency...")
    .addOptions(
      Object.entries(CURRENCY_LABELS).map(([value, name]) => ({ label: name, value })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildSellPriceModal(discordUserId, characterId, itemId, currencyType, itemName) {
  const modal = new ModalBuilder()
    .setCustomId(`sell-price-modal:${discordUserId}:${characterId}:${itemId}:${currencyType}`)
    .setTitle(truncateValue(`Sell ${itemName}`, 45));

  const priceInput = new TextInputBuilder()
    .setCustomId("sell-price")
    .setLabel(`Price (in ${CURRENCY_LABELS[currencyType] || currencyType})`)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(10);

  modal.addComponents(new ActionRowBuilder().addComponents(priceInput));
  return modal;
}

function buildCancelListingRow(discordUserId, listings) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`sell-cancel-pick:${discordUserId}`)
    .setPlaceholder("Choose a listing to cancel...")
    .addOptions(
      listings.slice(0, 25).map((listing) => ({
        label: truncateValue(`${listing.itemName} (${listing.sellerCharacterName})`, 100),
        description: `${listing.price} ${CURRENCY_LABELS[listing.currencyType] || listing.currencyType}`.slice(0, 100),
        value: String(listing.id),
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

module.exports = {
  CURRENCY_LABELS,
  DuplicateActiveListingError,
  buildCancelListingRow,
  buildSellCharacterRow,
  buildSellCurrencyRow,
  buildSellItemRow,
  buildSellPriceModal,
  cancelListing,
  createListing,
  findActiveListingByCharacterAndItem,
  getCharacterInventory,
  listActiveListingsForCharacter,
  listActiveListingsForDiscordUser,
};
