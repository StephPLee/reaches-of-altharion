CREATE TABLE IF NOT EXISTS world_wiki_categories (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS world_wiki_pages (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  markdown TEXT NOT NULL DEFAULT '',
  category_id INTEGER REFERENCES world_wiki_categories(id) ON DELETE SET NULL,
  cover_image_path TEXT,
  attributes JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_draft BOOLEAN NOT NULL DEFAULT FALSE,
  gm_only BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS world_wiki_pages_category_idx
  ON world_wiki_pages (category_id);
CREATE INDEX IF NOT EXISTS world_wiki_pages_updated_idx
  ON world_wiki_pages (updated_at DESC);

CREATE TABLE IF NOT EXISTS world_wiki_images (
  id SERIAL PRIMARY KEY,
  file_name TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  uploaded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timeline_events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  era_label TEXT NOT NULL,
  sort_value NUMERIC NOT NULL,
  category TEXT,
  linked_wiki_slug TEXT REFERENCES world_wiki_pages(slug) ON DELETE SET NULL,
  is_draft BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS timeline_events_sort_idx
  ON timeline_events (sort_value);
