-- The reverse of player_marketplace_listings: a player requests an item
-- (identified by free-text name, since it may not exist yet) and offers
-- gold and/or SC for it. Fulfillment is all-or-nothing (no partial
-- fulfillment), so — unlike listings — a single request has at most one
-- fulfiller ever, and that can live directly on the request row.

CREATE TABLE IF NOT EXISTS player_marketplace_requests (
  id BIGSERIAL PRIMARY KEY,

  requester_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  requester_discord_user_id TEXT NOT NULL,
  requester_character_id TEXT NOT NULL,
  requester_character_name TEXT NOT NULL,

  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),

  offer_price_gold INTEGER,
  offer_price_sc INTEGER,

  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'fulfilled', 'cancelled', 'failed')),

  fulfiller_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  fulfiller_discord_user_id TEXT,
  fulfiller_character_id TEXT,
  fulfiller_character_name TEXT,
  fulfilled_item_id TEXT,

  failure_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fulfilled_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  CONSTRAINT player_marketplace_requests_price_gold_check
    CHECK (offer_price_gold IS NULL OR offer_price_gold > 0),
  CONSTRAINT player_marketplace_requests_price_sc_check
    CHECK (offer_price_sc IS NULL OR offer_price_sc > 0),
  CONSTRAINT player_marketplace_requests_at_least_one_price_check
    CHECK (offer_price_gold IS NOT NULL OR offer_price_sc IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS player_marketplace_requests_status_idx
  ON player_marketplace_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS player_marketplace_requests_requester_idx
  ON player_marketplace_requests (requester_discord_user_id, status);
