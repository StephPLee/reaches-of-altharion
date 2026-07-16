const { pool } = require("./db");
const { westMarchesGoldCurrencyId, westMarchesScCurrencyId } = require("./config");
const { getCharacter, grantCharacterReward, transferCharacterInventoryItem } = require("./westmarches");

class PurchaseError extends Error {
  constructor(code, status) {
    super(code);
    this.status = status;
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

function resolveCurrencyId(currencyType) {
  return currencyType === "gold" ? westMarchesGoldCurrencyId : westMarchesScCurrencyId;
}

function resolveListingPrice(listing, currencyType) {
  return currencyType === "gold" ? listing.price_gold : listing.price_sc;
}

async function listActiveListings() {
  const result = await pool.query(
    `SELECT * FROM player_marketplace_listings WHERE status = 'active' ORDER BY created_at DESC`,
  );
  return result.rows.map(mapListingRow);
}

async function getListing(id) {
  const result = await pool.query(`SELECT * FROM player_marketplace_listings WHERE id = $1`, [id]);
  return mapListingRow(result.rows[0]);
}

async function markListingFailed(client, listingId, reason) {
  await client.query(
    `UPDATE player_marketplace_listings SET status = 'failed', failure_reason = $2, updated_at = NOW() WHERE id = $1`,
    [listingId, reason],
  );
}

async function purchaseListing({
  listingId,
  buyerUserId,
  buyerDiscordUserId,
  buyerCharacterId,
  currencyType,
  quantity,
}) {
  const client = await pool.connect();
  let committed = false;
  try {
    await client.query("BEGIN");

    const lockResult = await client.query(
      `SELECT * FROM player_marketplace_listings WHERE id = $1 FOR UPDATE`,
      [listingId],
    );
    const listing = lockResult.rows[0];
    if (!listing) throw new PurchaseError("not_found", 404);
    if (listing.status !== "active") throw new PurchaseError("listing_not_active", 409);
    if (listing.seller_discord_user_id === buyerDiscordUserId) {
      throw new PurchaseError("cannot_buy_own_listing", 400);
    }
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > listing.quantity) {
      throw new PurchaseError("invalid_quantity", 400);
    }

    const unitPrice = resolveListingPrice(listing, currencyType);
    if (unitPrice === null || unitPrice === undefined) {
      throw new PurchaseError("currency_not_offered_by_listing", 400);
    }
    const totalPrice = unitPrice * quantity;

    const buyerCharacter = await getCharacter(buyerCharacterId);
    if (!buyerCharacter || buyerCharacter?.user?.discordId !== buyerDiscordUserId) {
      throw new PurchaseError("invalid_buyer_character", 403);
    }

    const currencyId = resolveCurrencyId(currencyType);
    if (!currencyId) throw new PurchaseError("currency_not_configured", 503);

    // Step 1: item seller -> buyer. Nothing else has happened yet if this fails.
    try {
      await transferCharacterInventoryItem({
        characterId: listing.seller_character_id,
        itemId: listing.item_id,
        toCharacterId: buyerCharacterId,
        quantity,
      });
    } catch (transferError) {
      await markListingFailed(client, listingId, `item_transfer_failed: ${transferError.message}`);
      await client.query("COMMIT");
      committed = true;
      throw new PurchaseError("item_no_longer_available", 409);
    }

    // Step 2: debit buyer. If this fails, reverse the item transfer.
    try {
      await grantCharacterReward({
        characterId: buyerCharacterId,
        currencies: { [currencyId]: -totalPrice },
        reason: `Marketplace purchase: ${listing.item_name}`.slice(0, 500),
        discordUserId: buyerDiscordUserId,
      });
    } catch (debitError) {
      try {
        await transferCharacterInventoryItem({
          characterId: buyerCharacterId,
          itemId: listing.item_id,
          toCharacterId: listing.seller_character_id,
          quantity,
        });
      } catch (reversalError) {
        await markListingFailed(
          client,
          listingId,
          `debit_failed_and_reversal_failed: ${debitError.message} / ${reversalError.message}`,
        );
        await client.query("COMMIT");
        committed = true;
        throw new PurchaseError("debit_failed_manual_reconciliation_required", 500);
      }
      await markListingFailed(client, listingId, `debit_failed_reversed: ${debitError.message}`);
      await client.query("COMMIT");
      committed = true;
      throw new PurchaseError("insufficient_currency_or_debit_failed", 402);
    }

    // Step 3: credit seller. Item and payment have already moved — do not reverse on failure.
    // A credit-only failure is recorded on the purchase row, not the listing,
    // since any remaining stock in the listing is still perfectly sellable.
    let creditFailed = false;
    try {
      await grantCharacterReward({
        characterId: listing.seller_character_id,
        currencies: { [currencyId]: totalPrice },
        reason: `Marketplace sale: ${listing.item_name}`.slice(0, 500),
        discordUserId: listing.seller_discord_user_id,
      });
    } catch (creditError) {
      creditFailed = true;
      console.error(
        "CRITICAL: marketplace purchase moved item+debit but seller credit failed — manual reconciliation required",
        { listingId, error: creditError },
      );
    }

    await client.query(
      `
      INSERT INTO player_marketplace_purchases (
        listing_id, buyer_user_id, buyer_discord_user_id, buyer_character_id, buyer_character_name,
        quantity, currency_type, unit_price, total_price, credit_failed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        listingId,
        buyerUserId,
        buyerDiscordUserId,
        buyerCharacterId,
        buyerCharacter.name || null,
        quantity,
        currencyType,
        unitPrice,
        totalPrice,
        creditFailed,
      ],
    );

    const remainingQuantity = listing.quantity - quantity;
    const updateResult = await client.query(
      `
      UPDATE player_marketplace_listings
      SET quantity = $2, status = $3, updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [listingId, remainingQuantity, remainingQuantity === 0 ? "sold" : "active"],
    );

    await client.query("COMMIT");
    committed = true;
    return { listing: mapListingRow(updateResult.rows[0]), creditFailed };
  } catch (error) {
    if (!committed) {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    client.release();
  }
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

function resolveRequestPrice(request, currencyType) {
  return currencyType === "gold" ? request.offer_price_gold : request.offer_price_sc;
}

async function listOpenRequests() {
  const result = await pool.query(
    `SELECT * FROM player_marketplace_requests WHERE status = 'open' ORDER BY created_at DESC`,
  );
  return result.rows.map(mapRequestRow);
}

async function markRequestFailed(client, requestId, reason) {
  await client.query(
    `UPDATE player_marketplace_requests SET status = 'failed', failure_reason = $2, updated_at = NOW() WHERE id = $1`,
    [requestId, reason],
  );
}

function getInventoryItemsFromCharacter(character) {
  return Array.isArray(character?.inventoryItems) ? character.inventoryItems : [];
}

async function getOwnedCharacterInventory(characterId, discordUserId) {
  const character = await getCharacter(characterId);
  if (!character || character?.user?.discordId !== discordUserId) {
    return null;
  }
  return getInventoryItemsFromCharacter(character).map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description || null,
    quantity: item.quantity,
    remainingQty: item.remainingQty,
  }));
}

async function fulfillRequest({
  requestId,
  fulfillerUserId,
  fulfillerDiscordUserId,
  fulfillerCharacterId,
  fulfillerItemId,
  currencyType,
}) {
  const client = await pool.connect();
  let committed = false;
  try {
    await client.query("BEGIN");

    const lockResult = await client.query(
      `SELECT * FROM player_marketplace_requests WHERE id = $1 FOR UPDATE`,
      [requestId],
    );
    const request = lockResult.rows[0];
    if (!request) throw new PurchaseError("not_found", 404);
    if (request.status !== "open") throw new PurchaseError("request_not_open", 409);
    if (request.requester_discord_user_id === fulfillerDiscordUserId) {
      throw new PurchaseError("cannot_fulfill_own_request", 400);
    }

    const unitPrice = resolveRequestPrice(request, currencyType);
    if (unitPrice === null || unitPrice === undefined) {
      throw new PurchaseError("currency_not_offered_by_request", 400);
    }
    const totalPrice = unitPrice * request.quantity;

    const fulfillerCharacter = await getCharacter(fulfillerCharacterId);
    if (!fulfillerCharacter || fulfillerCharacter?.user?.discordId !== fulfillerDiscordUserId) {
      throw new PurchaseError("invalid_fulfiller_character", 403);
    }

    const currencyId = resolveCurrencyId(currencyType);
    if (!currencyId) throw new PurchaseError("currency_not_configured", 503);

    // Step 1: item fulfiller -> requester. Nothing else has happened yet if this fails.
    try {
      await transferCharacterInventoryItem({
        characterId: fulfillerCharacterId,
        itemId: fulfillerItemId,
        toCharacterId: request.requester_character_id,
        quantity: request.quantity,
      });
    } catch (transferError) {
      await markRequestFailed(client, requestId, `item_transfer_failed: ${transferError.message}`);
      await client.query("COMMIT");
      committed = true;
      throw new PurchaseError("item_no_longer_available", 409);
    }

    // Step 2: debit requester. If this fails, reverse the item transfer.
    try {
      await grantCharacterReward({
        characterId: request.requester_character_id,
        currencies: { [currencyId]: -totalPrice },
        reason: `Marketplace request fulfilled: ${request.item_name}`.slice(0, 500),
        discordUserId: request.requester_discord_user_id,
      });
    } catch (debitError) {
      try {
        await transferCharacterInventoryItem({
          characterId: request.requester_character_id,
          itemId: fulfillerItemId,
          toCharacterId: fulfillerCharacterId,
          quantity: request.quantity,
        });
      } catch (reversalError) {
        await markRequestFailed(
          client,
          requestId,
          `debit_failed_and_reversal_failed: ${debitError.message} / ${reversalError.message}`,
        );
        await client.query("COMMIT");
        committed = true;
        throw new PurchaseError("debit_failed_manual_reconciliation_required", 500);
      }
      await markRequestFailed(client, requestId, `debit_failed_reversed: ${debitError.message}`);
      await client.query("COMMIT");
      committed = true;
      throw new PurchaseError("insufficient_currency_or_debit_failed", 402);
    }

    // Step 3: credit fulfiller. Item and payment have already moved — do not reverse on failure.
    let creditFailed = false;
    try {
      await grantCharacterReward({
        characterId: fulfillerCharacterId,
        currencies: { [currencyId]: totalPrice },
        reason: `Marketplace request payout: ${request.item_name}`.slice(0, 500),
        discordUserId: fulfillerDiscordUserId,
      });
    } catch (creditError) {
      creditFailed = true;
      console.error(
        "CRITICAL: request fulfillment moved item+debit but fulfiller credit failed — manual reconciliation required",
        { requestId, error: creditError },
      );
    }

    const updateResult = await client.query(
      `
      UPDATE player_marketplace_requests
      SET status = 'fulfilled', fulfiller_user_id = $2, fulfiller_discord_user_id = $3,
          fulfiller_character_id = $4, fulfiller_character_name = $5, fulfilled_item_id = $6,
          fulfilled_at = NOW(), updated_at = NOW(), failure_reason = $7
      WHERE id = $1
      RETURNING *
      `,
      [
        requestId,
        fulfillerUserId,
        fulfillerDiscordUserId,
        fulfillerCharacterId,
        fulfillerCharacter.name || null,
        fulfillerItemId,
        creditFailed ? "fulfiller_credit_failed_manual_reconciliation_required" : null,
      ],
    );

    await client.query("COMMIT");
    committed = true;
    return { request: mapRequestRow(updateResult.rows[0]), creditFailed };
  } catch (error) {
    if (!committed) {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  PurchaseError,
  fulfillRequest,
  getListing,
  getOwnedCharacterInventory,
  listActiveListings,
  listOpenRequests,
  purchaseListing,
};
