CREATE TABLE IF NOT EXISTS banned_content_entries (
  id BIGSERIAL PRIMARY KEY,
  sourcebook_entry_id BIGINT NOT NULL REFERENCES sourcebook_entries(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS banned_content_entries_book_type_title_idx
  ON banned_content_entries (sourcebook_entry_id, LOWER(content_type), LOWER(title));

CREATE INDEX IF NOT EXISTS banned_content_entries_book_sort_idx
  ON banned_content_entries (sourcebook_entry_id, sort_order, LOWER(content_type), LOWER(title));
