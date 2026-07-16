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
        currencyType: row.currency_type,
        price: row.price,
        status: row.status,
        buyerDiscordUserId: row.buyer_discord_user_id,
        buyerCharacterId: row.buyer_character_id,
        buyerCharacterName: row.buyer_character_name,
        failureReason: row.failure_reason,
        createdAt: row.created_at,
        soldAt: row.sold_at,
      }
    : null;
}

function resolveCurrencyId(currencyType) {
  return currencyType === "gold" ? westMarchesGoldCurrencyId : westMarchesScCurrencyId;
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

async function purchaseListing({ listingId, buyerUserId, buyerDiscordUserId, buyerCharacterId }) {
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

    const buyerCharacter = await getCharacter(buyerCharacterId);
    if (!buyerCharacter || buyerCharacter?.user?.discordId !== buyerDiscordUserId) {
      throw new PurchaseError("invalid_buyer_character", 403);
    }

    const currencyId = resolveCurrencyId(listing.currency_type);
    if (!currencyId) throw new PurchaseError("currency_not_configured", 503);

    // Step 1: item seller -> buyer. Nothing else has happened yet if this fails.
    try {
      await transferCharacterInventoryItem({
        characterId: listing.seller_character_id,
        itemId: listing.item_id,
        toCharacterId: buyerCharacterId,
        quantity: listing.quantity,
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
        currencies: { [currencyId]: -listing.price },
        reason: `Marketplace purchase: ${listing.item_name}`.slice(0, 500),
        discordUserId: buyerDiscordUserId,
      });
    } catch (debitError) {
      try {
        await transferCharacterInventoryItem({
          characterId: buyerCharacterId,
          itemId: listing.item_id,
          toCharacterId: listing.seller_character_id,
          quantity: listing.quantity,
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
    let creditFailed = false;
    try {
      await grantCharacterReward({
        characterId: listing.seller_character_id,
        currencies: { [currencyId]: listing.price },
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

    const updateResult = await client.query(
      `
      UPDATE player_marketplace_listings
      SET status = 'sold', buyer_user_id = $2, buyer_discord_user_id = $3, buyer_character_id = $4,
          buyer_character_name = $5, sold_at = NOW(), updated_at = NOW(), failure_reason = $6
      WHERE id = $1
      RETURNING *
      `,
      [
        listingId,
        buyerUserId,
        buyerDiscordUserId,
        buyerCharacterId,
        buyerCharacter.name || null,
        creditFailed ? "seller_credit_failed_manual_reconciliation_required" : null,
      ],
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

module.exports = {
  PurchaseError,
  getListing,
  listActiveListings,
  purchaseListing,
};
