CREATE TABLE IF NOT EXISTS wiki_pages (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  markdown TEXT NOT NULL DEFAULT '',
  updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wiki_pages_updated_idx
  ON wiki_pages (updated_at DESC);
