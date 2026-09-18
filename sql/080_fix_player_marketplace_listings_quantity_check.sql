-- The original quantity > 0 check (from 050) predates the 052 change that
-- makes a listing's quantity deplete as buyers purchase part of it. A
-- listing that sells out is marked quantity = 0 / status = 'sold', which
-- violated the old constraint and rolled back the final step of
-- purchaseListing() even though the item transfer and currency movement
-- (done outside this transaction) had already gone through.
ALTER TABLE player_marketplace_listings
  DROP CONSTRAINT IF EXISTS player_marketplace_listings_quantity_check,
  ADD CONSTRAINT player_marketplace_listings_quantity_check
    CHECK (quantity > 0 OR status <> 'active');
