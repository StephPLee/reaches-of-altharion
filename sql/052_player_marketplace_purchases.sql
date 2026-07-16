-- price_gold/price_sc on player_marketplace_listings are now treated as
-- per-unit prices, and a listing's `quantity` depletes as buyers purchase
-- part of it rather than the whole listing at once. A listing can therefore
-- have multiple buyers over its lifetime, so per-purchase buyer info moves
-- into its own ledger table instead of living on the listing row.

CREATE TABLE IF NOT EXISTS player_marketplace_purchases (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES player_marketplace_listings(id) ON DELETE CASCADE,
  buyer_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  buyer_discord_user_id TEXT NOT NULL,
  buyer_character_id TEXT NOT NULL,
  buyer_character_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  currency_type TEXT NOT NULL CHECK (currency_type IN ('gold', 'sc')),
  unit_price INTEGER NOT NULL CHECK (unit_price > 0),
  total_price INTEGER NOT NULL CHECK (total_price > 0),
  credit_failed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS player_marketplace_purchases_listing_idx
  ON player_marketplace_purchases (listing_id, created_at DESC);

CREATE INDEX IF NOT EXISTS player_marketplace_purchases_buyer_idx
  ON player_marketplace_purchases (buyer_discord_user_id, created_at DESC);

-- Best-effort backfill of any already-sold listings' single buyer record.
-- currency_type is a guess (prefers gold when both prices are set) since the
-- currency actually used at sale time wasn't retained after the 051 dual
-- currency migration — acceptable given this is early test data.
INSERT INTO player_marketplace_purchases (
  listing_id, buyer_user_id, buyer_discord_user_id, buyer_character_id, buyer_character_name,
  quantity, currency_type, unit_price, total_price, created_at
)
SELECT
  l.id,
  l.buyer_user_id,
  l.buyer_discord_user_id,
  l.buyer_character_id,
  l.buyer_character_name,
  l.quantity,
  CASE WHEN l.price_gold IS NOT NULL THEN 'gold' ELSE 'sc' END,
  COALESCE(l.price_gold, l.price_sc),
  COALESCE(l.price_gold, l.price_sc) * l.quantity,
  COALESCE(l.sold_at, l.updated_at)
FROM player_marketplace_listings l
WHERE l.status = 'sold'
  AND l.buyer_discord_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM player_marketplace_purchases p WHERE p.listing_id = l.id
  );

ALTER TABLE player_marketplace_listings
  DROP COLUMN IF EXISTS buyer_user_id,
  DROP COLUMN IF EXISTS buyer_discord_user_id,
  DROP COLUMN IF EXISTS buyer_character_id,
  DROP COLUMN IF EXISTS buyer_character_name,
  DROP COLUMN IF EXISTS sold_at;
