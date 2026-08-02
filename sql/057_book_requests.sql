CREATE TABLE IF NOT EXISTS book_requests (
  id BIGSERIAL PRIMARY KEY,
  discord_user_id TEXT NOT NULL,
  requester_username TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'purchased')),
  source TEXT NOT NULL CHECK (source IN ('bot', 'website')),
  purchased_by_discord_user_id TEXT,
  purchased_by_username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  purchased_at TIMESTAMPTZ,
  CONSTRAINT book_requests_title_not_blank CHECK (length(btrim(title)) > 0)
);

CREATE INDEX IF NOT EXISTS book_requests_status_idx
  ON book_requests (status, created_at DESC);

CREATE TABLE IF NOT EXISTS book_request_upvotes (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES book_requests(id) ON DELETE CASCADE,
  discord_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, discord_user_id)
);

CREATE INDEX IF NOT EXISTS book_request_upvotes_request_idx
  ON book_request_upvotes (request_id);
