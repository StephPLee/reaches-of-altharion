CREATE TABLE IF NOT EXISTS player_marketplace_listings (
  id BIGSERIAL PRIMARY KEY,

  seller_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  seller_discord_user_id TEXT NOT NULL,
  seller_character_id TEXT NOT NULL,
  seller_character_name TEXT NOT NULL,

  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_description TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),

  currency_type TEXT NOT NULL CHECK (currency_type IN ('gold', 'sc')),
  price INTEGER NOT NULL CHECK (price > 0),

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'sold', 'cancelled', 'failed')),

  buyer_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  buyer_discord_user_id TEXT,
  buyer_character_id TEXT,
  buyer_character_name TEXT,

  failure_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sold_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Prevent two simultaneous active listings for the same (character, item).
CREATE UNIQUE INDEX IF NOT EXISTS player_marketplace_listings_active_unique_idx
  ON player_marketplace_listings (seller_character_id, item_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS player_marketplace_listings_status_idx
  ON player_marketplace_listings (status, created_at DESC);

CREATE INDEX IF NOT EXISTS player_marketplace_listings_seller_idx
  ON player_marketplace_listings (seller_discord_user_id, status);
