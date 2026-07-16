ALTER TABLE player_marketplace_listings
  ADD COLUMN IF NOT EXISTS price_gold INTEGER,
  ADD COLUMN IF NOT EXISTS price_sc INTEGER;

UPDATE player_marketplace_listings
SET
  price_gold = CASE WHEN currency_type = 'gold' THEN price ELSE price_gold END,
  price_sc = CASE WHEN currency_type = 'sc' THEN price ELSE price_sc END
WHERE price_gold IS NULL AND price_sc IS NULL;

ALTER TABLE player_marketplace_listings
  DROP CONSTRAINT IF EXISTS player_marketplace_listings_price_gold_check,
  ADD CONSTRAINT player_marketplace_listings_price_gold_check
    CHECK (price_gold IS NULL OR price_gold > 0),
  DROP CONSTRAINT IF EXISTS player_marketplace_listings_price_sc_check,
  ADD CONSTRAINT player_marketplace_listings_price_sc_check
    CHECK (price_sc IS NULL OR price_sc > 0),
  DROP CONSTRAINT IF EXISTS player_marketplace_listings_at_least_one_price_check,
  ADD CONSTRAINT player_marketplace_listings_at_least_one_price_check
    CHECK (price_gold IS NOT NULL OR price_sc IS NOT NULL);

ALTER TABLE player_marketplace_listings
  DROP COLUMN IF EXISTS currency_type,
  DROP COLUMN IF EXISTS price;
