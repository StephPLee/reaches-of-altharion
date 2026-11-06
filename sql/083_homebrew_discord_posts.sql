-- Bot-owned Discord forum posts that mirror the homebrew lists on the site.
-- entry_messages is the ordered list of subcategory messages in the post:
-- [{"entryId": 12, "messageIds": ["..."], "contents": ["..."]}, ...]
-- contents is the last text posted, so unchanged messages aren't re-edited.
CREATE TABLE IF NOT EXISTS homebrew_discord_posts (
  post_key TEXT PRIMARY KEY,
  thread_id TEXT,
  entry_messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
